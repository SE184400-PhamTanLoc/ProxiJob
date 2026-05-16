using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Logout
{
    public class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
    {
        private readonly IAuthRepository _authRepository;
        private readonly IUnitOfWork _unitOfWork;

        public LogoutCommandHandler(IAuthRepository authRepository, IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<bool> Handle(LogoutCommand request, CancellationToken cancellationToken)
        {
            var storedToken = await _authRepository.GetRefreshTokenAsync(request.RefreshToken, cancellationToken);
            if (storedToken == null || storedToken.IsRevoked)
                return false;

            await _authRepository.RevokeRefreshTokenAsync(storedToken, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
