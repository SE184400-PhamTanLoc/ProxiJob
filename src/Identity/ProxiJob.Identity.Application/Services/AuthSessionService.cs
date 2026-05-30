using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;
using RefreshTokenModel = ProxiJob.Identity.Domain.Models.RefreshToken;

namespace ProxiJob.Identity.Application.Services
{
    public class AuthSessionService : IAuthSessionService
    {
        private readonly IAuthRepository _authRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IJobPostQuotaService _jobPostQuotaService;
        private readonly IStudentProfileRepository _studentProfileRepository;
        private readonly ITokenService _tokenService;
        private readonly IUnitOfWork _unitOfWork;

        public AuthSessionService(
            IAuthRepository authRepository,
            IRoleRepository roleRepository,
            ISubscriptionRepository subscriptionRepository,
            IJobPostQuotaService jobPostQuotaService,
            IStudentProfileRepository studentProfileRepository,
            ITokenService tokenService,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _roleRepository = roleRepository;
            _subscriptionRepository = subscriptionRepository;
            _jobPostQuotaService = jobPostQuotaService;
            _studentProfileRepository = studentProfileRepository;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthTokensDto> IssueSessionAsync(User user, CancellationToken cancellationToken = default)
        {
            var roleName = await _roleRepository.GetUserRoleNameAsync(user.Id, cancellationToken)
                ?? RoleNames.Student;
            var quota = await _jobPostQuotaService.GetQuotaAsync(user.Id, roleName, cancellationToken);
            var featureCodes = await _subscriptionRepository.GetUserFeatureCodesAsync(user.Id, cancellationToken);

            string? profileReadiness = null;
            decimal reputationScore = 0;
            if (roleName == RoleNames.Student)
            {
                var studentProfile = await _studentProfileRepository.GetByUserIdAsync(user.Id, cancellationToken);
                profileReadiness = studentProfile?.ReadinessStatus ?? ProfileReadinessStatus.Incomplete;
                reputationScore = studentProfile?.ReputationScore ?? 0;
            }

            var accessToken = _tokenService.GenerateAccessToken(
                user,
                roleName,
                quota.SubscriptionTier,
                quota.JobPostLimit,
                quota.JobPostsUsed,
                featureCodes,
                profileReadiness,
                reputationScore);
            var refreshTokenValue = _tokenService.GenerateRefreshToken();

            var refreshToken = new RefreshTokenModel
            {
                UserId = user.Id,
                Token = refreshTokenValue,
                ExpiryDate = _tokenService.GetRefreshTokenExpiry(),
                IsRevoked = false,
                CreatedBy = user.Email
            };

            await _authRepository.AddRefreshTokenAsync(refreshToken, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new AuthTokensDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                Expiration = _tokenService.GetAccessTokenExpiry()
            };
        }
    }
}
