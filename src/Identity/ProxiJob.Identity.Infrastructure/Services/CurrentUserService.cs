using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
            => _httpContextAccessor = httpContextAccessor;

        private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

        public int? UserId
        {
            get
            {
                var sub = User?.FindFirstValue("sub")
                    ?? User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                    ?? User?.FindFirstValue(ClaimTypes.NameIdentifier);
                return int.TryParse(sub, out var id) ? id : null;
            }
        }

        public string? Role => User?.FindFirstValue("role") ?? User?.FindFirstValue(ClaimTypes.Role);

        public string? SubscriptionTier => User?.FindFirstValue(ClaimNames.SubscriptionTier);
    }
}
