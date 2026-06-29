using ProxiJob.Shared.Contract.Identity;

namespace ProxiJob.Management.Application.Common.Interfaces;

public interface IIdentityGrpcClient
{
    Task<IdentityUserContextSnapshot?> GetUserFromAccessTokenAsync(string? accessToken, CancellationToken cancellationToken = default);

    Task<IdentityUserContextSnapshot?> GetUserByIdAsync(int userId, CancellationToken cancellationToken = default);

    Task<bool> UpdateStudentReputationAsync(int userId, double rating, string comment, CancellationToken cancellationToken = default);

    Task<bool> UpdateBusinessReputationAsync(int userId, double rating, string comment, CancellationToken cancellationToken = default);
}
