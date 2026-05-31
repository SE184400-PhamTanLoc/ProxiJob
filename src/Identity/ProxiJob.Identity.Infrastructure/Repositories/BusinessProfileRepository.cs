using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;

namespace ProxiJob.Identity.Infrastructure.Repositories
{
    public class BusinessProfileRepository : IBusinessProfileRepository
    {
        private readonly IdentityDbContext _context;

        public BusinessProfileRepository(IdentityDbContext context) => _context = context;

        public async Task<BusinessProfile?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
            => await _context.BusinessProfiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        public async Task<BusinessProfile?> GetByUserIdWithUserAsync(int userId, CancellationToken cancellationToken = default)
            => await _context.BusinessProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        public async Task AddAsync(BusinessProfile profile, CancellationToken cancellationToken = default)
            => await _context.BusinessProfiles.AddAsync(profile, cancellationToken);

        public Task UpdateAsync(BusinessProfile profile, CancellationToken cancellationToken = default)
        {
            _context.BusinessProfiles.Update(profile);
            return Task.CompletedTask;
        }
    }
}
