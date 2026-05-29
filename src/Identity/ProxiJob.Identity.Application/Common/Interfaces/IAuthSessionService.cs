using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IAuthSessionService
    {
        Task<AuthResponseDto> IssueSessionAsync(User user, CancellationToken cancellationToken = default);
    }
}
