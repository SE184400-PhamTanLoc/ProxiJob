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
        private readonly ITokenService _tokenService;
        private readonly IUnitOfWork _unitOfWork;

        public AuthSessionService(
            IAuthRepository authRepository,
            IRoleRepository roleRepository,
            ISubscriptionRepository subscriptionRepository,
            ITokenService tokenService,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _roleRepository = roleRepository;
            _subscriptionRepository = subscriptionRepository;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthTokensDto> IssueSessionAsync(User user, CancellationToken cancellationToken = default)
        {
            var roleName = await _roleRepository.GetUserRoleNameAsync(user.Id, cancellationToken)
                ?? RoleNames.Student;
            var (tier, jobPostLimit) = await _subscriptionRepository.GetUserTierInfoAsync(user.Id, cancellationToken);
            var featureCodes = await _subscriptionRepository.GetUserFeatureCodesAsync(user.Id, cancellationToken);

            var accessToken = _tokenService.GenerateAccessToken(user, roleName, tier, jobPostLimit, featureCodes);
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
