using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
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
                    (us, s) => new { s.Name, s.JobPostLimit })
                .OrderByDescending(x => x.Name)
                .FirstOrDefaultAsync(cancellationToken);

            if (active == null)
                return (SubscriptionNames.Free, 0);

            return (active.Name, active.JobPostLimit);
        }

        public async Task AssignSubscriptionAsync(int userId, string subscriptionName, string createdBy, CancellationToken cancellationToken = default)
        {
            var plan = await GetByNameAsync(subscriptionName, cancellationToken)
                ?? throw new InvalidOperationException($"Subscription '{subscriptionName}' is not configured.");

            var now = DateTime.UtcNow;
            await _context.UserSubscriptions.AddAsync(new UserSubscription
            {
                UserId = userId,
                SubscriptionId = plan.Id,
                StartDate = now,
                EndDate = now.AddDays(plan.DurationDays),
                Status = "Active",
                CreatedBy = createdBy
            }, cancellationToken);
        }

        public async Task UpgradeSubscriptionAsync(int userId, string targetSubscriptionName, string updatedBy, CancellationToken cancellationToken = default)
        {
            var plan = await GetByNameAsync(targetSubscriptionName, cancellationToken)
                ?? throw new InvalidOperationException($"Subscription '{targetSubscriptionName}' is not configured.");

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
