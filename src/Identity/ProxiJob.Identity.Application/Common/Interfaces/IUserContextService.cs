using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IUserContextService
    {
        Task<UserContextDto?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Validate JWT access token (cùng secret với login) và trả context user.
        /// </summary>
        Task<UserContextDto?> GetFromAccessTokenAsync(string accessToken, CancellationToken cancellationToken = default);
    }
}
