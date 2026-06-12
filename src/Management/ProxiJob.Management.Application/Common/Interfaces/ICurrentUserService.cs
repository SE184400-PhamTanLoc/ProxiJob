using ProxiJob.Shared.Contract.Identity;

namespace ProxiJob.Management.Application.Common.Interfaces;

public interface ICurrentUserService
{
    IdentityUserContextSnapshot? IdentityUser { get; }
    int? UserId { get; }
    int? BusinessId { get; }
    string UserName { get; }
    bool IsAuthenticated { get; }
}
