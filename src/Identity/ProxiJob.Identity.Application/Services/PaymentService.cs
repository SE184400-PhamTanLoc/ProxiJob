using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;
using Microsoft.Extensions.Configuration;

namespace ProxiJob.Identity.Application.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEnumerable<IPaymentGateway> _gateways;
        private readonly IVNPayCallbackHandler _vnPayCallbackHandler;
        private readonly IMoMoCallbackHandler _momoCallbackHandler;
        private readonly int _orderExpirationMinutes;

        public PaymentService(
            IPaymentRepository paymentRepository,
            ISubscriptionRepository subscriptionRepository,
            IAuthRepository authRepository,
            IAuthSessionService authSessionService,
            IUnitOfWork unitOfWork,
            IEnumerable<IPaymentGateway> gateways,
            IVNPayCallbackHandler vnPayCallbackHandler,
            IMoMoCallbackHandler momoCallbackHandler,
            IConfiguration configuration)
        {
            _paymentRepository = paymentRepository;
            _subscriptionRepository = subscriptionRepository;
            _authRepository = authRepository;
            _authSessionService = authSessionService;
            _unitOfWork = unitOfWork;
            _gateways = gateways;
            _vnPayCallbackHandler = vnPayCallbackHandler;
            _momoCallbackHandler = momoCallbackHandler;
            _orderExpirationMinutes = configuration.GetValue("PaymentSettings:OrderExpirationMinutes", 15);
        }

        public async Task<PurchasePlanResponseDto> InitiatePurchaseAsync(
            int userId,
            int planId,
            PaymentGatewayType gateway,
            string clientIp,
            CancellationToken cancellationToken = default)
        {
            var plan = await _subscriptionRepository.GetByIdAsync(planId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.PlanNotFound);

            if (!SubscriptionNames.AllPaidPlans.Contains(plan.Name))
                throw new InvalidOperationException(BusinessMessages.InvalidPlanId);

            var active = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
            if (active?.SubscriptionId == planId)
                throw new InvalidOperationException(BusinessMessages.AlreadyOnPlan);

            var paymentGateway = ResolveGateway(gateway);

            var existingPending = await _paymentRepository.GetPendingByUserAndPlanAsync(userId, planId, cancellationToken);
            if (existingPending != null && !string.IsNullOrEmpty(existingPending.PaymentUrl))
            {
                return MapPurchaseResponse(existingPending, BusinessMessages.PaymentOrderCreated);
            }

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var order = new PaymentOrder
            {
                OrderCode = $"PJ{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(1000, 9999)}",
                UserId = userId,
                SubscriptionId = planId,
                Amount = plan.Price,
                Gateway = gateway,
                Status = PaymentOrderStatus.Pending,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_orderExpirationMinutes),
                CreatedBy = user.Email
            };

            var initiation = await paymentGateway.CreatePaymentAsync(order, clientIp, cancellationToken);
            order.PaymentUrl = initiation.PaymentUrl;
            order.GatewayTransactionId = initiation.GatewayTransactionId;

            await _paymentRepository.AddAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return MapPurchaseResponse(order, BusinessMessages.PaymentOrderCreated);
        }

        public async Task<PaymentOrderStatusDto> GetOrderStatusAsync(int orderId, int userId, CancellationToken cancellationToken = default)
        {
            var order = await GetOwnedOrderAsync(orderId, userId, cancellationToken);
            await ExpireIfNeededAsync(order, cancellationToken);
            return await MapStatusAsync(order, cancellationToken);
        }

        public async Task<AuthTokensDto?> IssueTokensIfPaidAsync(int orderId, int userId, CancellationToken cancellationToken = default)
        {
            var order = await GetOwnedOrderAsync(orderId, userId, cancellationToken);
            await ExpireIfNeededAsync(order, cancellationToken);

            if (order.Status != PaymentOrderStatus.Paid)
                return null;

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken);
            if (user == null)
                return null;

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }

        public async Task<bool> ProcessCallbackAsync(
            PaymentGatewayType gateway,
            IReadOnlyDictionary<string, string> parameters,
            CancellationToken cancellationToken = default)
        {
            var callback = gateway switch
            {
                PaymentGatewayType.VNPay => _vnPayCallbackHandler.ValidateCallback(parameters),
                PaymentGatewayType.MoMo => _momoCallbackHandler.ValidateCallback(parameters),
                _ => new PaymentCallbackResult { Success = false, FailureReason = "Unsupported gateway" }
            };

            if (string.IsNullOrEmpty(callback.OrderCode))
                return false;

            var order = await _paymentRepository.GetByOrderCodeAsync(callback.OrderCode, cancellationToken);
            if (order == null)
                return false;

            if (order.Status == PaymentOrderStatus.Paid)
                return true;

            if (!callback.Success)
            {
                order.Status = PaymentOrderStatus.Failed;
                order.FailureReason = callback.FailureReason ?? "Thanh toán thất bại.";
                order.UpdatedAt = DateTime.UtcNow;
                await _paymentRepository.UpdateAsync(order, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                return false;
            }

            await CompletePaidOrderAsync(order, callback.GatewayTransactionId, cancellationToken);
            return true;
        }

        public async Task<bool> ConfirmMockPaymentAsync(int orderId, CancellationToken cancellationToken = default)
        {
            var order = await _paymentRepository.GetByIdAsync(orderId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.PaymentOrderNotFound);

            if (order.Gateway != PaymentGatewayType.Mock)
                throw new InvalidOperationException(BusinessMessages.MockPaymentOnly);

            if (order.Status == PaymentOrderStatus.Paid)
                return true;

            await ExpireIfNeededAsync(order, cancellationToken);
            if (order.Status == PaymentOrderStatus.Expired)
                throw new InvalidOperationException(BusinessMessages.PaymentOrderExpired);

            await CompletePaidOrderAsync(order, $"MOCK-{order.OrderCode}", cancellationToken);
            return true;
        }

        private async Task CompletePaidOrderAsync(PaymentOrder order, string? gatewayTransactionId, CancellationToken cancellationToken)
        {
            var user = await _authRepository.GetUserByIdAsync(order.UserId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.UserNotFound);

            await _subscriptionRepository.SubscribeToPlanByIdAsync(
                order.UserId, order.SubscriptionId, user.Email, cancellationToken);

            order.Status = PaymentOrderStatus.Paid;
            order.PaidAt = DateTime.UtcNow;
            order.GatewayTransactionId = gatewayTransactionId ?? order.GatewayTransactionId;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = user.Email;

            await _paymentRepository.UpdateAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        private async Task<PaymentOrder> GetOwnedOrderAsync(int orderId, int userId, CancellationToken cancellationToken)
        {
            var order = await _paymentRepository.GetByIdAsync(orderId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.PaymentOrderNotFound);

            if (order.UserId != userId)
                throw new UnauthorizedAccessException(BusinessMessages.PaymentOrderAccessDenied);

            return order;
        }

        private async Task ExpireIfNeededAsync(PaymentOrder order, CancellationToken cancellationToken)
        {
            if (order.Status != PaymentOrderStatus.Pending || order.ExpiresAt > DateTime.UtcNow)
                return;

            order.Status = PaymentOrderStatus.Expired;
            order.UpdatedAt = DateTime.UtcNow;
            await _paymentRepository.UpdateAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        private IPaymentGateway ResolveGateway(PaymentGatewayType gateway)
        {
            var implementation = _gateways.FirstOrDefault(g => g.GatewayType == gateway)
                ?? throw new InvalidOperationException(BusinessMessages.InvalidGateway);

            if (!implementation.IsEnabled)
                throw new InvalidOperationException(BusinessMessages.GatewayNotEnabled);

            return implementation;
        }

        private async Task<PaymentOrderStatusDto> MapStatusAsync(PaymentOrder order, CancellationToken cancellationToken)
        {
            var plan = await _subscriptionRepository.GetByIdAsync(order.SubscriptionId, cancellationToken);
            return new PaymentOrderStatusDto
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                Gateway = PaymentGatewayNames.ToName(order.Gateway),
                Status = order.Status.ToString(),
                Amount = order.Amount,
                PlanId = order.SubscriptionId,
                PlanName = plan?.Name,
                ExpiresAt = order.ExpiresAt,
                PaidAt = order.PaidAt,
                FailureReason = order.FailureReason
            };
        }

        private static PurchasePlanResponseDto MapPurchaseResponse(PaymentOrder order, string message) =>
            new()
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                Gateway = PaymentGatewayNames.ToName(order.Gateway),
                Amount = order.Amount,
                PaymentUrl = order.PaymentUrl ?? string.Empty,
                ExpiresAt = order.ExpiresAt,
                Message = message
            };
    }
}
