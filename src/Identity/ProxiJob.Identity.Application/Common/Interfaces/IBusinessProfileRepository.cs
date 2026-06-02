using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IBusinessProfileRepository
    {
        Task<BusinessProfile?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);
        Task<BusinessProfile?> GetByUserIdWithUserAsync(int userId, CancellationToken cancellationToken = default);
        Task AddAsync(BusinessProfile profile, CancellationToken cancellationToken = default);
        Task UpdateAsync(BusinessProfile profile, CancellationToken cancellationToken = default);
    }
}
