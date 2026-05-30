using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Infrastructure.Authorization;
using ProxiJob.Identity.Infrastructure.Repositories;
using ProxiJob.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using System.Text;

namespace ProxiJob.Identity.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddHttpContextAccessor();

            // Repositories & Services
            services.AddScoped<IAuthRepository, AuthRepository>();
            services.AddScoped<IRoleRepository, RoleRepository>();
            services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            services.AddScoped<ITokenService, JwtTokenService>();
            services.AddScoped<IPasswordHasher, PasswordHasherService>();
            services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();

            // JWT Authentication
            var secretKey = configuration["JwtSettings:SecretKey"]!;
            var issuer = configuration["JwtSettings:Issuer"]!;
            var audience = configuration["JwtSettings:Audience"]!;

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                    ClockSkew = TimeSpan.Zero
                };
            });

            services.AddSingleton<IAuthorizationHandler, FeatureAuthorizationHandler>();

            services.AddAuthorization(options =>
            {
                options.AddPolicy(PolicyNames.StudentOnly, policy =>
                    policy.RequireRole(RoleNames.Student));

                options.AddPolicy(PolicyNames.BusinessOnly, policy =>
                    policy.RequireRole(RoleNames.Business));

                options.AddPolicy(PolicyNames.PremiumOnly, policy =>
                    policy.RequireClaim(ClaimNames.SubscriptionTier, SubscriptionNames.Premium));

                options.AddPolicy(PolicyNames.WebPostJob, policy =>
                    policy.Requirements.Add(new FeatureRequirement(FeatureCodes.WebPostJob)));

                options.AddPolicy(PolicyNames.HrManagement, policy =>
                    policy.Requirements.Add(new FeatureRequirement(FeatureCodes.HrManagement)));

                options.AddPolicy(PolicyNames.PriorityListing, policy =>
                    policy.Requirements.Add(new FeatureRequirement(FeatureCodes.PriorityListing)));
            });

            return services;
        }
    }
}
