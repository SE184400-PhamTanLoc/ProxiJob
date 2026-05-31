using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IPaymentService
    {
        Task<PurchasePlanResponseDto> InitiatePurchaseAsync(
            int userId,
            int planId,
            CancellationToken cancellationToken = default);

        Task<PaymentOrderStatusDto> GetOrderStatusAsync(int orderId, int userId, CancellationToken cancellationToken = default);

        Task<AuthTokensDto?> IssueTokensIfPaidAsync(int orderId, int userId, CancellationToken cancellationToken = default);

        Task<IReadOnlyList<AdminPaymentOrderDto>> GetPendingBankTransferOrdersAsync(CancellationToken cancellationToken = default);

        Task<AdminPaymentOrderDto> ConfirmBankTransferOrderAsync(
            int orderId,
            string adminEmail,
            string? adminNote,
            CancellationToken cancellationToken = default);

        Task<AdminPaymentOrderDto> RejectBankTransferOrderAsync(
            int orderId,
            string adminEmail,
            string? adminNote,
            CancellationToken cancellationToken = default);
    }
}
