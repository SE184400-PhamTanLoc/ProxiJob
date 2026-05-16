using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;
using RefreshTokenModel = ProxiJob.Identity.Domain.Models.RefreshToken;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly ITokenService _tokenService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IUnitOfWork _unitOfWork;

        public RegisterCommandHandler(
            IAuthRepository authRepository,
            ITokenService tokenService,
            IPasswordHasher passwordHasher,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _tokenService = tokenService;
            _passwordHasher = passwordHasher;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            var existing = await _authRepository.GetUserByEmailAsync(request.Email, cancellationToken);
            if (existing != null)
                throw new InvalidOperationException("Email is already in use.");

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                Username = request.Email,
                PasswordHash = _passwordHasher.Hash(request.Password),
                IsActive = true,
                CreatedBy = request.Email
            };

            await _authRepository.AddUserAsync(user, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var accessToken = _tokenService.GenerateAccessToken(user, "Student");
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

            return new AuthResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshTokenValue,
                Expiration = _tokenService.GetAccessTokenExpiry(),
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName
            };
        }
    }
}
