using ProxiJob.Shared.Contract.Identity;

namespace ProxiJob.Management.Application.Common.Interfaces;

public interface IIdentityGrpcClient
{
    Task<IdentityUserContextSnapshot?> GetUserFromAccessTokenAsync(string? accessToken, CancellationToken cancellationToken = default);

    Task<IdentityUserContextSnapshot?> GetUserByIdAsync(int userId, CancellationToken cancellationToken = default);
}
