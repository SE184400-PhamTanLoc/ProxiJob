using System.Security.Claims;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public int? BusinessId
    {
        get
        {
            // Convention: businessId claim (can be adjusted later to match Identity contract)
            var value = _httpContextAccessor.HttpContext?.User?.FindFirstValue("businessId")
                        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("business_id");
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string UserName =>
        _httpContextAccessor.HttpContext?.User?.Identity?.Name
        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Name)
        ?? "System";
}

