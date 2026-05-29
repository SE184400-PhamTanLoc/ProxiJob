using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface ISubscriptionRepository
    {
        Task<IReadOnlyList<Subscription>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<Subscription?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<Subscription?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
        Task<UserSubscription?> GetActiveByUserIdAsync(int userId, CancellationToken cancellationToken = default);
        Task<(string Tier, int JobPostLimit)> GetUserTierInfoAsync(int userId, CancellationToken cancellationToken = default);
        Task AssignSubscriptionAsync(int userId, string subscriptionName, string createdBy, CancellationToken cancellationToken = default);
        Task UpgradeSubscriptionAsync(int userId, string targetSubscriptionName, string updatedBy, CancellationToken cancellationToken = default);
    }
}
