using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class JwtTokenService : ITokenService
    {
        private readonly string _secretKey;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly int _accessTokenExpirationMinutes;
        private readonly int _refreshTokenExpirationDays;

        public JwtTokenService(IConfiguration configuration)
        {
            _secretKey = configuration["JwtSettings:SecretKey"]!;
            _issuer = configuration["JwtSettings:Issuer"]!;
            _audience = configuration["JwtSettings:Audience"]!;
            _accessTokenExpirationMinutes = int.Parse(configuration["JwtSettings:AccessTokenExpirationMinutes"]!);
            _refreshTokenExpirationDays = int.Parse(configuration["JwtSettings:RefreshTokenExpirationDays"]!);
        }

        public string GenerateAccessToken(
            User user,
            string role,
            string subscriptionTier,
            int jobPostLimit,
            int jobPostsUsed,
            IReadOnlyList<string> featureCodes,
            string? profileStatus = null,
            decimal reputationScore = 0)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email),
                new("name", user.FullName),
                new("role", role),
                new(ClaimNames.SubscriptionTier, subscriptionTier),
                new(ClaimNames.JobPostLimit, jobPostLimit.ToString()),
                new(ClaimNames.JobPostsUsed, jobPostsUsed.ToString()),
                new(ClaimNames.Features, string.Join(",", featureCodes)),
                new(ClaimNames.AvatarUrl, user.AvatarUrl ?? ""),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if ((role == RoleNames.Student || role == RoleNames.Business) && !string.IsNullOrEmpty(profileStatus))
            {
                claims.Add(new Claim(ClaimNames.ProfileStatus, profileStatus));
                if (role == RoleNames.Student)
                    claims.Add(new Claim(ClaimNames.ProfileReadiness, profileStatus));
                claims.Add(new Claim(ClaimNames.ReputationScore, reputationScore.ToString("F1", System.Globalization.CultureInfo.InvariantCulture)));
            }

            var token = new JwtSecurityToken(
                issuer: _issuer,
                audience: _audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_accessTokenExpirationMinutes),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
            => Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");

        public DateTime GetRefreshTokenExpiry()
            => DateTime.UtcNow.AddDays(_refreshTokenExpirationDays);

        public DateTime GetAccessTokenExpiry()
            => DateTime.UtcNow.AddMinutes(_accessTokenExpirationMinutes);
    }
}
