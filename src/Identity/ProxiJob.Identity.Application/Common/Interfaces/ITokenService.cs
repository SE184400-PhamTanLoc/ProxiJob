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
            IReadOnlyList<string> featureCodes,
            string? profileReadiness = null,
            decimal reputationScore = 0);
        string GenerateRefreshToken();
        DateTime GetRefreshTokenExpiry();
        DateTime GetAccessTokenExpiry();
    }
}
