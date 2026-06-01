using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Shared.Contract.Identity;

namespace ProxiJob.Management.API.Middleware;

/// <summary>
/// Gọi Identity gRPC khi request có Bearer token — lưu user context vào HttpContext (chưa chặn 401).
/// </summary>
public class IdentityUserContextMiddleware
{
    private readonly RequestDelegate _next;

    public IdentityUserContextMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IIdentityGrpcClient identityGrpcClient)
    {
        var token = ExtractBearerToken(context);
        if (!string.IsNullOrEmpty(token))
        {
            var userContext = await identityGrpcClient.GetUserFromAccessTokenAsync(token, context.RequestAborted);
            if (userContext != null)
                context.Items[IdentityUserContextHttpKeys.ItemKey] = userContext;
        }

        await _next(context);
    }

    internal static string? ExtractBearerToken(HttpContext context)
    {
        var header = context.Request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        if (string.IsNullOrEmpty(header) || !header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return null;
        return header[prefix.Length..].Trim();
    }
}
