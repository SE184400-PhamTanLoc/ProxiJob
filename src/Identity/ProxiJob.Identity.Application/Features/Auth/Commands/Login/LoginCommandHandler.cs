using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IPasswordHasher _passwordHasher;

        public LoginCommandHandler(
            IAuthRepository authRepository,
            IAuthSessionService authSessionService,
            IPasswordHasher passwordHasher)
        {
            _authRepository = authRepository;
            _authSessionService = authSessionService;
            _passwordHasher = passwordHasher;
        }

        public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var user = await _authRepository.GetUserByEmailAsync(request.Email, cancellationToken);
            if (user == null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password.");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive.");

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }
    }
}
