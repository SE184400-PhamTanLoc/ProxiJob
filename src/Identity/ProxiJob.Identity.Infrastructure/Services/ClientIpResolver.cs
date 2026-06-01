using Microsoft.AspNetCore.Http;
using ProxiJob.Identity.Application.Common.Interfaces;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class ClientIpResolver : IClientIpResolver
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public ClientIpResolver(IHttpContextAccessor httpContextAccessor)
            => _httpContextAccessor = httpContextAccessor;

        public string GetClientIp()
        {
            var context = _httpContextAccessor.HttpContext;
            if (context == null)
                return "127.0.0.1";

            var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwarded))
                return forwarded.Split(',')[0].Trim();

            return context.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "127.0.0.1";
        }
    }
}
