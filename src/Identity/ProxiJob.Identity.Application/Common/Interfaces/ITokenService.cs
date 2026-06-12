using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface ITokenService
    {
        string GenerateAccessToken(
            User user,
            string role,
            string subscriptionTier,
            int jobPostLimit,
            int jobPostsUsed,
            IReadOnlyList<string> featureCodes,
            string? profileStatus = null,
            decimal reputationScore = 0);
        string GenerateRefreshToken();
        DateTime GetRefreshTokenExpiry();
        DateTime GetAccessTokenExpiry();
    }
}
