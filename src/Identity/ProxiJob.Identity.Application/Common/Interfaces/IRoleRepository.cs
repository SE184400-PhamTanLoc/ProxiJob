using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IRoleRepository
    {
        Task<Role?> GetByNameAsync(string name, CancellationToken cancellationToken = default);
        Task<string?> GetUserRoleNameAsync(int userId, CancellationToken cancellationToken = default);
        Task AssignRoleToUserAsync(int userId, string roleName, string createdBy, CancellationToken cancellationToken = default);
    }
}
