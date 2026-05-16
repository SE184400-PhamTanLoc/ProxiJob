using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;
using RefreshTokenModel = ProxiJob.Identity.Domain.Models.RefreshToken;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken
{
    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly ITokenService _tokenService;
        private readonly IUnitOfWork _unitOfWork;

        public RefreshTokenCommandHandler(
            IAuthRepository authRepository,
            ITokenService tokenService,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            var storedToken = await _authRepository.GetRefreshTokenAsync(request.RefreshToken, cancellationToken);

            if (storedToken == null)
                throw new UnauthorizedAccessException("Invalid refresh token.");
            if (storedToken.IsRevoked)
                throw new UnauthorizedAccessException("Refresh token has been revoked.");
            if (storedToken.ExpiryDate < DateTime.UtcNow)
                throw new UnauthorizedAccessException("Refresh token has expired.");

            var user = await _authRepository.GetUserByIdAsync(storedToken.UserId, cancellationToken);
            if (user == null || !user.IsActive)
                throw new UnauthorizedAccessException("User not found or inactive.");

            // Revoke old token
            await _authRepository.RevokeRefreshTokenAsync(storedToken, cancellationToken);

            // Issue new tokens
            var newAccessToken = _tokenService.GenerateAccessToken(user, "Student");
            var newRefreshTokenValue = _tokenService.GenerateRefreshToken();

            var newRefreshToken = new RefreshTokenModel
            {
                UserId = user.Id,
                Token = newRefreshTokenValue,
                ExpiryDate = _tokenService.GetRefreshTokenExpiry(),
                IsRevoked = false,
                CreatedBy = user.Email
            };

            await _authRepository.AddRefreshTokenAsync(newRefreshToken, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new AuthResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshTokenValue,
                Expiration = _tokenService.GetAccessTokenExpiry(),
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName
            };
        }
    }
}
