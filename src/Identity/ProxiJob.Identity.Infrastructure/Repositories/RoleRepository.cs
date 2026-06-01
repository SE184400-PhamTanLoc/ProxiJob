using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Models;
using ProxiJob.Identity.Infrastructure.Data;

namespace ProxiJob.Identity.Infrastructure.Repositories
{
    public class RoleRepository : IRoleRepository
    {
        private readonly IdentityDbContext _context;

        public RoleRepository(IdentityDbContext context) => _context = context;

        public async Task<Role?> GetByNameAsync(string name, CancellationToken cancellationToken = default)
            => await _context.Roles
                .FirstOrDefaultAsync(r => r.Name == name, cancellationToken);

        public async Task<string?> GetUserRoleNameAsync(int userId, CancellationToken cancellationToken = default)
            => await _context.UserRoles
                .Include(ur => ur.Role)
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.Role!.Name)
                .FirstOrDefaultAsync(cancellationToken);

        public async Task AssignRoleToUserAsync(int userId, string roleName, string createdBy, CancellationToken cancellationToken = default)
        {
            var role = await GetByNameAsync(roleName, cancellationToken)
                ?? throw new InvalidOperationException(BusinessMessages.RoleNotConfigured);

            var existing = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId, cancellationToken);

            if (existing != null)
            {
                existing.RoleId = role.Id;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.UpdatedBy = createdBy;
                _context.UserRoles.Update(existing);
                return;
            }

            await _context.UserRoles.AddAsync(new UserRole
            {
                UserId = userId,
                RoleId = role.Id,
                CreatedBy = createdBy
            }, cancellationToken);
        }
    }
}
