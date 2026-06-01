using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;

namespace ProxiJob.Identity.Infrastructure.Repositories
{
    public class SubscriptionRepository : ISubscriptionRepository
    {
        private readonly IdentityDbContext _context;

        public SubscriptionRepository(IdentityDbContext context) => _context = context;

        public async Task<IReadOnlyList<Subscription>> GetAllAsync(CancellationToken cancellationToken = default)
            => await _context.Subscriptions
                .OrderBy(s => s.Price)
                .ToListAsync(cancellationToken);

        public async Task<Subscription?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
            => await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        public async Task<Subscription?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
            => await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.Name == name, cancellationToken);

        public async Task<UserSubscription?> GetActiveByUserIdAsync(int userId, CancellationToken cancellationToken = default)
            => await _context.UserSubscriptions
                .Where(us => us.UserId == userId && us.Status == "Active" && us.EndDate >= DateTime.UtcNow)
                .OrderByDescending(us => us.StartDate)
                .FirstOrDefaultAsync(cancellationToken);

        public async Task<(string Tier, int JobPostLimit)> GetUserTierInfoAsync(int userId, CancellationToken cancellationToken = default)
        {
            var active = await _context.UserSubscriptions
                .Where(us => us.UserId == userId && us.Status == "Active" && us.EndDate >= DateTime.UtcNow)
                .Join(_context.Subscriptions,
                    us => us.SubscriptionId,
                    s => s.Id,
                    (us, s) => new { s.Name, s.JobPostLimit, s.Price })
                .OrderByDescending(x => x.Price)
                .FirstOrDefaultAsync(cancellationToken);

            if (active != null)
                return (active.Name, active.JobPostLimit);

            var role = await GetUserRoleNameAsync(userId, cancellationToken);
            if (role == RoleNames.Business)
                return (SubscriptionNames.Trial, BusinessQuotaConstants.FreeTrialJobPostLimit);

            return (SubscriptionNames.None, 0);
        }

        public async Task<IReadOnlyList<string>> GetUserFeatureCodesAsync(int userId, CancellationToken cancellationToken = default)
        {
            var active = await GetActiveByUserIdAsync(userId, cancellationToken);
            if (active != null)
            {
                var features = await GetFeaturesForSubscriptionAsync(active.SubscriptionId, cancellationToken);
                return features.Select(f => f.Code).ToList();
            }

            var role = await GetUserRoleNameAsync(userId, cancellationToken);
            if (role != RoleNames.Business)
                return Array.Empty<string>();

            var used = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.JobPostsUsed)
                .FirstOrDefaultAsync(cancellationToken);

            if (used < BusinessQuotaConstants.FreeTrialJobPostLimit)
                return new[] { FeatureCodes.WebPostJob };

            return Array.Empty<string>();
        }

        private async Task<string?> GetUserRoleNameAsync(int userId, CancellationToken cancellationToken)
            => await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (_, r) => r.Name)
                .FirstOrDefaultAsync(cancellationToken);

        public async Task<IReadOnlyList<SubscriptionFeature>> GetFeaturesForSubscriptionAsync(
            int subscriptionId, CancellationToken cancellationToken = default)
            => await _context.SubscriptionFeatures
                .Where(f => f.SubscriptionId == subscriptionId)
                .OrderBy(f => f.Code)
                .ToListAsync(cancellationToken);

        public async Task<IReadOnlyList<PlanComparisonDto>> GetPlanComparisonAsync(CancellationToken cancellationToken = default)
        {
            var plans = await _context.Subscriptions
                .Where(s => SubscriptionNames.AllPaidPlans.Contains(s.Name))
                .OrderBy(s => s.Price)
                .ToListAsync(cancellationToken);

            var result = plans.Select(plan => new PlanComparisonDto
            {
                Id = plan.Id,
                PlanName = plan.Name,
                Description = plan.Description,
                Price = plan.Price,
                VariableCost = plan.VariableCost,
                GrossMargin = plan.GrossMargin,
                BillingType = plan.BillingType.ToString(),
                JobPostLimit = plan.JobPostLimit,
                DurationDays = plan.DurationDays,
                HasPriorityDisplay = plan.HasPriorityDisplay,
                HasHrManagement = plan.HasHrManagement
            }).ToList();

            return result;
        }

        public async Task AssignSubscriptionAsync(int userId, string subscriptionName, string createdBy, CancellationToken cancellationToken = default)
            => await SubscribeToPlanAsync(userId, subscriptionName, createdBy, cancellationToken);

        public async Task SubscribeToPlanAsync(int userId, string planName, string updatedBy, CancellationToken cancellationToken = default)
        {
            var plan = await GetByNameAsync(planName, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.SubscriptionNotConfigured);

            await SubscribeToPlanByIdAsync(userId, plan.Id, updatedBy, cancellationToken);
        }

        public async Task SubscribeToPlanByIdAsync(int userId, int planId, string updatedBy, CancellationToken cancellationToken = default)
        {
            var plan = await GetByIdAsync(planId, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.PlanNotFound);

            if (!SubscriptionNames.AllPaidPlans.Contains(plan.Name))
                throw new InvalidOperationException(BusinessMessages.InvalidPlanId);

            var activeSubscriptions = await _context.UserSubscriptions
                .Where(us => us.UserId == userId && us.Status == "Active")
                .ToListAsync(cancellationToken);

            foreach (var sub in activeSubscriptions)
            {
                sub.Status = "Cancelled";
                sub.UpdatedAt = DateTime.UtcNow;
                sub.UpdatedBy = updatedBy;
            }

            var now = DateTime.UtcNow;
            await _context.UserSubscriptions.AddAsync(new UserSubscription
            {
                UserId = userId,
                SubscriptionId = plan.Id,
                StartDate = now,
                EndDate = now.AddDays(plan.DurationDays),
                Status = "Active",
                CreatedBy = updatedBy
            }, cancellationToken);
        }
    }
}
