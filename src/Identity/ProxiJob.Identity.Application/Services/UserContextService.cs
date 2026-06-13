using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Services
{
    public class UserContextService : IUserContextService
    {
        private readonly IAuthRepository _authRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IJobPostQuotaService _jobPostQuotaService;
        private readonly IStudentProfileRepository _studentProfileRepository;
        private readonly IBusinessProfileRepository _businessProfileRepository;
        private readonly IAccessTokenValidator _accessTokenValidator;

        public UserContextService(
            IAuthRepository authRepository,
            IRoleRepository roleRepository,
            ISubscriptionRepository subscriptionRepository,
            IJobPostQuotaService jobPostQuotaService,
            IStudentProfileRepository studentProfileRepository,
            IBusinessProfileRepository businessProfileRepository,
            IAccessTokenValidator accessTokenValidator)
        {
            _authRepository = authRepository;
            _roleRepository = roleRepository;
            _subscriptionRepository = subscriptionRepository;
            _jobPostQuotaService = jobPostQuotaService;
            _studentProfileRepository = studentProfileRepository;
            _businessProfileRepository = businessProfileRepository;
            _accessTokenValidator = accessTokenValidator;
        }

        public async Task<UserContextDto?> GetFromAccessTokenAsync(string accessToken, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(accessToken))
                return null;

            var principal = _accessTokenValidator.Validate(accessToken.Trim());
            if (principal == null)
                return null;

            var sub = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(sub, out var userId))
                return null;

            return await GetByUserIdAsync(userId, cancellationToken);
        }

        public async Task<UserContextDto?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
                return null;

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken);
            if (user == null)
                return null;

            var roleName = await _roleRepository.GetUserRoleNameAsync(user.Id, cancellationToken)
                ?? RoleNames.Student;
            var quota = await _jobPostQuotaService.GetQuotaAsync(user.Id, roleName, cancellationToken);
            var featureCodes = await _subscriptionRepository.GetUserFeatureCodesAsync(user.Id, cancellationToken);

            string? profileStatus = null;
            decimal reputationScore = 0;
            if (roleName == RoleNames.Student)
            {
                var studentProfile = await _studentProfileRepository.GetByUserIdAsync(user.Id, cancellationToken);
                profileStatus = studentProfile?.ReadinessStatus ?? ProfileReadinessStatus.Incomplete;
                reputationScore = studentProfile?.ReputationScore ?? 0;
            }
            else if (roleName == RoleNames.Business)
            {
                var businessProfile = await _businessProfileRepository.GetByUserIdAsync(user.Id, cancellationToken);
                profileStatus = businessProfile?.ReadinessStatus ?? ProfileReadinessStatus.Incomplete;
                reputationScore = businessProfile?.ReputationScore ?? 0;
            }

            return new UserContextDto
            {
                UserId = user.Id,
                BusinessId = roleName == RoleNames.Business ? user.Id : 0,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                AvatarUrl = user.AvatarUrl,
                Role = roleName,
                SubscriptionTier = quota.SubscriptionTier,
                JobPostLimit = quota.JobPostLimit,
                JobPostsUsed = quota.JobPostsUsed,
                ProfileStatus = profileStatus,
                ReputationScore = reputationScore,
                IsActive = user.IsActive,
                Features = featureCodes
            };
        }
    }
}
