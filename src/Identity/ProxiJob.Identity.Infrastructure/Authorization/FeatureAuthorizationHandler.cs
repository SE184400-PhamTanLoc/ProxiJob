using Microsoft.AspNetCore.Authorization;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Infrastructure.Authorization
{
    public class FeatureAuthorizationHandler : AuthorizationHandler<FeatureRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            FeatureRequirement requirement)
        {
            var featuresClaim = context.User.FindFirst(ClaimNames.Features)?.Value;
            if (string.IsNullOrEmpty(featuresClaim))
            {
                context.Fail(new AuthorizationFailureReason(this, BusinessMessages.FeatureNotAllowed));
                return Task.CompletedTask;
            }

            var codes = featuresClaim.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (codes.Contains(requirement.FeatureCode, StringComparer.OrdinalIgnoreCase))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }

            context.Fail(new AuthorizationFailureReason(this, BusinessMessages.FeatureNotAllowed));
            return Task.CompletedTask;
        }
    }
}
