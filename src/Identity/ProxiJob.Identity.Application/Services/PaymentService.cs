using Microsoft.Extensions.Configuration;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _paymentRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IBankTransferPaymentService _bankTransfer;
        private readonly IUnitOfWork _unitOfWork;
        private readonly string _publicBaseUrl;
        private readonly int _orderExpirationMinutes;

        public PaymentService(
            IPaymentRepository paymentRepository,
            ISubscriptionRepository subscriptionRepository,
            IAuthRepository authRepository,
            IAuthSessionService authSessionService,
            IBankTransferPaymentService bankTransfer,
            IUnitOfWork unitOfWork,
            IConfiguration configuration)
        {
            _paymentRepository = paymentRepository;
            _subscriptionRepository = subscriptionRepository;
            _authRepository = authRepository;
            _authSessionService = authSessionService;
            _bankTransfer = bankTransfer;
            _unitOfWork = unitOfWork;
            _publicBaseUrl = configuration.GetValue("PaymentSettings:PublicBaseUrl", "https://localhost:7159")!;
            _orderExpirationMinutes = configuration.GetValue("BankTransfer:OrderExpirationMinutes", 1440);
        }

        public async Task<PurchasePlanResponseDto> InitiatePurchaseAsync(
            int userId,
            int planId,
            CancellationToken cancellationToken = default)
        {
            if (!_bankTransfer.IsConfigured)
            {
                var details = string.Join(", ", _bankTransfer.GetConfigurationErrors());
                throw new InvalidOperationException(
                    $"{BusinessMessages.BankTransferNotConfigured} Thiếu: {details}");
            }

            var plan = await _subscriptionRepository.GetByIdAsync(planId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.PlanNotFound);

            if (!SubscriptionNames.AllPaidPlans.Contains(plan.Name))
                throw new InvalidOperationException(BusinessMessages.InvalidPlanId);

            var active = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
            if (active?.SubscriptionId == planId)
                throw new InvalidOperationException(BusinessMessages.AlreadyOnPlan);

            var existingPending = await _paymentRepository.GetPendingByUserAndPlanAsync(userId, planId, cancellationToken);
            if (existingPending != null)
            {
                var existingInstructions = _bankTransfer.CreateInstructions(existingPending, _publicBaseUrl);
                return MapPurchaseResponse(existingPending, BusinessMessages.PaymentOrderCreated, existingInstructions.BankTransfer);
            }

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            var order = new PaymentOrder
            {
                OrderCode = $"PJ{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(1000, 9999)}",
                UserId = userId,
                SubscriptionId = planId,
                Amount = plan.Price,
                Gateway = PaymentGatewayType.BankTransfer,
                Status = PaymentOrderStatus.Pending,
                ExpiresAt = DateTime.UtcNow.AddMinutes(_orderExpirationMinutes),
                CreatedBy = user.Email
            };

            var initiation = _bankTransfer.CreateInstructions(order, _publicBaseUrl);
            order.PaymentUrl = initiation.QrImageUrl;
            order.GatewayTransactionId = initiation.GatewayTransactionId;

            await _paymentRepository.AddAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return MapPurchaseResponse(order, BusinessMessages.PaymentOrderCreated, initiation.BankTransfer);
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
            return user == null ? null : await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }

        public async Task<IReadOnlyList<AdminPaymentOrderDto>> GetPendingBankTransferOrdersAsync(CancellationToken cancellationToken = default)
        {
            var orders = await _paymentRepository.GetByStatusAsync(
                PaymentOrderStatus.Pending, PaymentGatewayType.BankTransfer, cancellationToken);

            var result = new List<AdminPaymentOrderDto>();
            foreach (var order in orders)
            {
                await ExpireIfNeededAsync(order, cancellationToken);
                if (order.Status == PaymentOrderStatus.Pending)
                    result.Add(await MapAdminOrderAsync(order, cancellationToken));
            }

            return result;
        }

        public async Task<AdminPaymentOrderDto> ConfirmBankTransferOrderAsync(
            int orderId,
            string adminEmail,
            string? adminNote,
            CancellationToken cancellationToken = default)
        {
            var order = await GetBankTransferOrderAsync(orderId, cancellationToken);

            if (order.Status == PaymentOrderStatus.Paid)
                return await MapAdminOrderAsync(order, cancellationToken);

            await ExpireIfNeededAsync(order, cancellationToken);
            if (order.Status == PaymentOrderStatus.Expired)
                throw new InvalidOperationException(BusinessMessages.PaymentOrderExpired);
            if (order.Status != PaymentOrderStatus.Pending)
                throw new InvalidOperationException(BusinessMessages.PaymentOrderNotPending);

            await CompletePaidOrderAsync(order, order.OrderCode, adminEmail, adminNote, cancellationToken);
            return await MapAdminOrderAsync(order, cancellationToken);
        }

        public async Task<AdminPaymentOrderDto> RejectBankTransferOrderAsync(
            int orderId,
            string adminEmail,
            string? adminNote,
            CancellationToken cancellationToken = default)
        {
            var order = await GetBankTransferOrderAsync(orderId, cancellationToken);

            if (order.Status != PaymentOrderStatus.Pending)
                throw new InvalidOperationException(BusinessMessages.PaymentOrderNotPending);

            order.Status = PaymentOrderStatus.Cancelled;
            order.FailureReason = adminNote ?? "Admin từ chối đơn thanh toán.";
            order.ConfirmedBy = adminEmail;
            order.AdminNote = adminNote;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = adminEmail;

            await _paymentRepository.UpdateAsync(order, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await MapAdminOrderAsync(order, cancellationToken);
        }

        private async Task<PaymentOrder> GetBankTransferOrderAsync(int orderId, CancellationToken cancellationToken)
        {
            var order = await _paymentRepository.GetByIdAsync(orderId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.PaymentOrderNotFound);

            if (order.Gateway != PaymentGatewayType.BankTransfer)
                throw new InvalidOperationException(BusinessMessages.BankTransferOnly);

            return order;
        }

        private async Task CompletePaidOrderAsync(
            PaymentOrder order,
            string? gatewayTransactionId,
            string? confirmedBy,
            string? adminNote,
            CancellationToken cancellationToken)
        {
            var user = await _authRepository.GetUserByIdAsync(order.UserId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.UserNotFound);

            await _subscriptionRepository.SubscribeToPlanByIdAsync(
                order.UserId, order.SubscriptionId, user.Email, cancellationToken);

            order.Status = PaymentOrderStatus.Paid;
            order.PaidAt = DateTime.UtcNow;
            order.GatewayTransactionId = gatewayTransactionId ?? order.GatewayTransactionId;
            order.ConfirmedBy = confirmedBy;
            order.AdminNote = adminNote;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = confirmedBy ?? user.Email;

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

        private async Task<PaymentOrderStatusDto> MapStatusAsync(PaymentOrder order, CancellationToken cancellationToken)
        {
            var plan = await _subscriptionRepository.GetByIdAsync(order.SubscriptionId, cancellationToken);
            BankTransferInstructionsDto? bankTransfer = null;

            if (order.Status == PaymentOrderStatus.Pending)
            {
                var initiation = _bankTransfer.CreateInstructions(order, _publicBaseUrl);
                bankTransfer = initiation.BankTransfer;
            }

            return new PaymentOrderStatusDto
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                Gateway = PaymentGatewayNames.BankTransfer,
                Status = order.Status.ToString(),
                Amount = order.Amount,
                PlanId = order.SubscriptionId,
                PlanName = plan?.Name,
                ExpiresAt = order.ExpiresAt,
                PaidAt = order.PaidAt,
                FailureReason = order.FailureReason,
                BankTransfer = bankTransfer
            };
        }

        private async Task<AdminPaymentOrderDto> MapAdminOrderAsync(PaymentOrder order, CancellationToken cancellationToken)
        {
            var plan = await _subscriptionRepository.GetByIdAsync(order.SubscriptionId, cancellationToken);
            var user = await _authRepository.GetUserByIdAsync(order.UserId, cancellationToken);

            return new AdminPaymentOrderDto
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                Status = order.Status.ToString(),
                Amount = order.Amount,
                PlanId = order.SubscriptionId,
                PlanName = plan?.Name,
                UserId = order.UserId,
                UserEmail = user?.Email ?? "",
                UserFullName = user?.FullName ?? "",
                CreatedAt = order.CreatedAt,
                ExpiresAt = order.ExpiresAt,
                PaidAt = order.PaidAt,
                ConfirmedBy = order.ConfirmedBy,
                AdminNote = order.AdminNote
            };
        }

        private static PurchasePlanResponseDto MapPurchaseResponse(
            PaymentOrder order,
            string message,
            BankTransferInstructionsDto? bankTransfer = null)
        {
            bankTransfer ??= new BankTransferInstructionsDto
            {
                TransferContent = order.OrderCode,
                Amount = order.Amount,
                QrImageUrl = order.PaymentUrl
            };

            return new PurchasePlanResponseDto
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                Gateway = PaymentGatewayNames.BankTransfer,
                Amount = order.Amount,
                ExpiresAt = order.ExpiresAt,
                Message = message,
                BankTransfer = bankTransfer
            };
        }
    }
}
