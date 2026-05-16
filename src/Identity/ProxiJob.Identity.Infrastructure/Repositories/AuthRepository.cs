using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;

namespace ProxiJob.Identity.Infrastructure.Repositories
{
    public class AuthRepository : IAuthRepository
    {
        private readonly IdentityDbContext _context;

        public AuthRepository(IdentityDbContext context) => _context = context;

        public async Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken = default)
            => await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        public async Task<User?> GetUserByIdAsync(int id, CancellationToken cancellationToken = default)
            => await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

        public async Task AddUserAsync(User user, CancellationToken cancellationToken = default)
            => await _context.Users.AddAsync(user, cancellationToken);

        public async Task<RefreshToken?> GetRefreshTokenAsync(string token, CancellationToken cancellationToken = default)
            => await _context.RefreshTokens
                .FirstOrDefaultAsync(t => t.Token == token, cancellationToken);

        public async Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
            => await _context.RefreshTokens.AddAsync(refreshToken, cancellationToken);

        public Task RevokeRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default)
        {
            refreshToken.IsRevoked = true;
            refreshToken.UpdatedAt = DateTime.UtcNow;
            _context.RefreshTokens.Update(refreshToken);
            return Task.CompletedTask;
        }
    }
}
