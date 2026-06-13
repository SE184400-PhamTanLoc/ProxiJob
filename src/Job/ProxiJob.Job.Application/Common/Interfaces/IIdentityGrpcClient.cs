using ProxiJob.Shared.Contract.Identity;
using ProxiJob.Shared.Contract.Protos;

namespace ProxiJob.Job.Application.Common.Interfaces;

public interface IIdentityGrpcClient
{
    Task<IdentityUserContextSnapshot?> GetUserFromAccessTokenAsync(string? accessToken, CancellationToken cancellationToken = default);

    Task<IdentityUserContextSnapshot?> GetUserByIdAsync(int userId, CancellationToken cancellationToken = default);

    Task<string?> GetStudentCVUrlAsync(int studentId, CancellationToken cancellationToken = default);

    Task<StudentProfileGrpcDto?> GetStudentProfileAsync(int studentId, CancellationToken cancellationToken = default);
}
