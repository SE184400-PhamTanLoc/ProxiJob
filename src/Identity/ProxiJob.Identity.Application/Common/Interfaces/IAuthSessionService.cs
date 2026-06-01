using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IAuthSessionService
    {
        Task<AuthTokensDto> IssueSessionAsync(User user, CancellationToken cancellationToken = default);
    }
}
