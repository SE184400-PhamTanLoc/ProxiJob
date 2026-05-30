using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IPaymentRepository
    {
        Task<PaymentOrder?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<PaymentOrder?> GetByOrderCodeAsync(string orderCode, CancellationToken cancellationToken = default);
        Task<PaymentOrder?> GetPendingByUserAndPlanAsync(int userId, int planId, CancellationToken cancellationToken = default);
        Task AddAsync(PaymentOrder order, CancellationToken cancellationToken = default);
        Task UpdateAsync(PaymentOrder order, CancellationToken cancellationToken = default);
    }
}
