using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken
{
    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public RefreshTokenCommandHandler(
            IAuthRepository authRepository,
            IAuthSessionService authSessionService,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _authSessionService = authSessionService;
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

            await _authRepository.RevokeRefreshTokenAsync(storedToken, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }
    }
}
