using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;

namespace ProxiJob.Identity.Infrastructure.Repositories
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly IdentityDbContext _context;

        public PaymentRepository(IdentityDbContext context) => _context = context;

        public async Task<PaymentOrder?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
            => await _context.PaymentOrders.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

        public async Task<PaymentOrder?> GetByOrderCodeAsync(string orderCode, CancellationToken cancellationToken = default)
            => await _context.PaymentOrders.FirstOrDefaultAsync(o => o.OrderCode == orderCode, cancellationToken);

        public async Task<PaymentOrder?> GetPendingByUserAndPlanAsync(int userId, int planId, CancellationToken cancellationToken = default)
            => await _context.PaymentOrders
                .Where(o => o.UserId == userId
                    && o.SubscriptionId == planId
                    && o.Status == PaymentOrderStatus.Pending
                    && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

        public async Task<IReadOnlyList<PaymentOrder>> GetByStatusAsync(
            PaymentOrderStatus status,
            PaymentGatewayType? gateway,
            CancellationToken cancellationToken = default)
        {
            var query = _context.PaymentOrders.AsQueryable()
                .Where(o => o.Status == status);

            if (gateway.HasValue)
                query = query.Where(o => o.Gateway == gateway.Value);

            return await query
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync(cancellationToken);
        }

        public Task<PaymentOrder?> GetByIdWithUserAsync(int id, CancellationToken cancellationToken = default)
            => GetByIdAsync(id, cancellationToken);

        public async Task AddAsync(PaymentOrder order, CancellationToken cancellationToken = default)
            => await _context.PaymentOrders.AddAsync(order, cancellationToken);

        public Task UpdateAsync(PaymentOrder order, CancellationToken cancellationToken = default)
        {
            _context.PaymentOrders.Update(order);
            return Task.CompletedTask;
        }
    }
}
