using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ProxiJob.Identity.Application.Common.Interfaces;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class JwtAccessTokenValidator : IAccessTokenValidator
    {
        private readonly TokenValidationParameters _validationParameters;

        public JwtAccessTokenValidator(IConfiguration configuration)
        {
            var secretKey = configuration["JwtSettings:SecretKey"]!;
            var issuer = configuration["JwtSettings:Issuer"]!;
            var audience = configuration["JwtSettings:Audience"]!;

            _validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = issuer,
                ValidAudience = audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ClockSkew = TimeSpan.Zero,
                NameClaimType = "name",
                RoleClaimType = "role"
            };
        }

        public ClaimsPrincipal? Validate(string accessToken)
        {
            try
            {
                var handler = new JwtSecurityTokenHandler();
                return handler.ValidateToken(accessToken, _validationParameters, out _);
            }
            catch
            {
                return null;
            }
        }
    }
}
