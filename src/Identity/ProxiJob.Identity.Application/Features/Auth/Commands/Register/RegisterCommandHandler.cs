using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly IRoleRepository _roleRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IUnitOfWork _unitOfWork;

        public RegisterCommandHandler(
            IAuthRepository authRepository,
            IRoleRepository roleRepository,
            ISubscriptionRepository subscriptionRepository,
            IAuthSessionService authSessionService,
            IPasswordHasher passwordHasher,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _roleRepository = roleRepository;
            _subscriptionRepository = subscriptionRepository;
            _authSessionService = authSessionService;
            _passwordHasher = passwordHasher;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            var existing = await _authRepository.GetUserByEmailAsync(request.Email, cancellationToken);
            if (existing != null)
                throw new InvalidOperationException("Email is already in use.");

            var roleName = request.UserType switch
            {
                UserType.Student => RoleNames.Student,
                UserType.Business => RoleNames.Business,
                _ => throw new InvalidOperationException("Invalid user type.")
            };

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

            await _roleRepository.AssignRoleToUserAsync(user.Id, roleName, request.Email, cancellationToken);

            if (request.UserType == UserType.Business)
            {
                await _subscriptionRepository.AssignSubscriptionAsync(
                    user.Id, SubscriptionNames.Free, request.Email, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }
    }
}
