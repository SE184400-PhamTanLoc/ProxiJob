using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Shared.Contract.Identity;

namespace ProxiJob.Management.API.Middleware;

public class GrpcAuthenticationOptions : AuthenticationSchemeOptions
{
}

public class GrpcAuthenticationHandler : AuthenticationHandler<GrpcAuthenticationOptions>
{
    private readonly IIdentityGrpcClient _identityGrpcClient;

    public GrpcAuthenticationHandler(
        IOptionsMonitor<GrpcAuthenticationOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IIdentityGrpcClient identityGrpcClient)
        : base(options, logger, encoder)
    {
        _identityGrpcClient = identityGrpcClient;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authHeader[prefix.Length..].Trim();
        try
        {
            var userContext = await _identityGrpcClient.GetUserFromAccessTokenAsync(token, Context.RequestAborted);
            if (userContext == null)
            {
                return AuthenticateResult.Fail("Invalid or expired access token.");
            }

            // Save userContext to HttpContext.Items for CurrentUserService compatibility
            Context.Items[IdentityUserContextHttpKeys.ItemKey] = userContext;

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userContext.UserId.ToString()),
                new Claim("UserId", userContext.UserId.ToString()),
                new Claim("BusinessId", userContext.BusinessId.ToString()),
                new Claim(ClaimTypes.Name, userContext.FullName ?? userContext.Email ?? "System"),
                new Claim(ClaimTypes.Email, userContext.Email ?? ""),
                new Claim(ClaimTypes.Role, userContext.Role ?? "")
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "gRPC Token Authentication failed");
            return AuthenticateResult.Fail(ex);
        }
    }
}
