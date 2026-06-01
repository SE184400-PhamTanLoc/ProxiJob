using ProxiJob.Identity.Application.DTOs;
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
        Task<IReadOnlyList<string>> GetUserFeatureCodesAsync(int userId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<SubscriptionFeature>> GetFeaturesForSubscriptionAsync(int subscriptionId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<PlanComparisonDto>> GetPlanComparisonAsync(CancellationToken cancellationToken = default);
        Task AssignSubscriptionAsync(int userId, string subscriptionName, string createdBy, CancellationToken cancellationToken = default);
        Task SubscribeToPlanAsync(int userId, string planName, string updatedBy, CancellationToken cancellationToken = default);
        Task SubscribeToPlanByIdAsync(int userId, int planId, string updatedBy, CancellationToken cancellationToken = default);
    }
}
