using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Enums;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IPaymentService
    {
        Task<PurchasePlanResponseDto> InitiatePurchaseAsync(
            int userId,
            int planId,
            PaymentGatewayType gateway,
            string clientIp,
            CancellationToken cancellationToken = default);

        Task<PaymentOrderStatusDto> GetOrderStatusAsync(int orderId, int userId, CancellationToken cancellationToken = default);

        Task<AuthTokensDto?> IssueTokensIfPaidAsync(int orderId, int userId, CancellationToken cancellationToken = default);

        Task<bool> ProcessCallbackAsync(
            PaymentGatewayType gateway,
            IReadOnlyDictionary<string, string> parameters,
            CancellationToken cancellationToken = default);

        Task<bool> ConfirmMockPaymentAsync(int orderId, CancellationToken cancellationToken = default);
    }
}
