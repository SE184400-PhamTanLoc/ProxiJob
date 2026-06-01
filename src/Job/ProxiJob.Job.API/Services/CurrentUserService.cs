using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Shared.Contract.Identity;

namespace ProxiJob.Job.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public IdentityUserContextSnapshot? IdentityUser =>
        _httpContextAccessor.HttpContext?.Items[IdentityUserContextHttpKeys.ItemKey] as IdentityUserContextSnapshot;

    public int? UserId => IdentityUser?.UserId;

    public int? BusinessId =>
        IdentityUser?.BusinessId > 0 ? IdentityUser.BusinessId : null;

    public string UserName =>
        IdentityUser?.FullName
        ?? IdentityUser?.Email
        ?? "System";

    public bool IsAuthenticated => IdentityUser != null;
}
