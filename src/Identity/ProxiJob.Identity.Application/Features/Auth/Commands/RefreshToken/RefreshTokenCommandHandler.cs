using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken
{
    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthTokensDto>
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

        public async Task<AuthTokensDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            var storedToken = await _authRepository.GetRefreshTokenAsync(request.RefreshToken, cancellationToken);

            if (storedToken == null)
                throw new UnauthorizedAccessException(BusinessMessages.InvalidRefreshToken);
            if (storedToken.IsRevoked)
                throw new UnauthorizedAccessException(BusinessMessages.RefreshTokenRevoked);
            if (storedToken.ExpiryDate < DateTime.UtcNow)
                throw new UnauthorizedAccessException(BusinessMessages.RefreshTokenExpired);

            var user = await _authRepository.GetUserByIdAsync(storedToken.UserId, cancellationToken);
            if (user == null || !user.IsActive)
                throw new UnauthorizedAccessException(BusinessMessages.UserNotFoundOrInactive);

            await _authRepository.RevokeRefreshTokenAsync(storedToken, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }
    }
}
