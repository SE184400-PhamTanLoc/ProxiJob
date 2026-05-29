using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.UpgradeSubscription
{
    public class UpgradeSubscriptionCommandHandler : IRequestHandler<UpgradeSubscriptionCommand, AuthResponseDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly ICurrentUserService _currentUser;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public UpgradeSubscriptionCommandHandler(
            IAuthRepository authRepository,
            ICurrentUserService currentUser,
            ISubscriptionRepository subscriptionRepository,
            IAuthSessionService authSessionService,
            IUnitOfWork unitOfWork)
        {
            _authRepository = authRepository;
            _currentUser = currentUser;
            _subscriptionRepository = subscriptionRepository;
            _authSessionService = authSessionService;
            _unitOfWork = unitOfWork;
        }

        public async Task<AuthResponseDto> Handle(UpgradeSubscriptionCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException("User is not authenticated.");

            if (_currentUser.Role != RoleNames.Business)
                throw new UnauthorizedAccessException("Only business accounts can upgrade subscription.");

            var (currentTier, _) = await _subscriptionRepository.GetUserTierInfoAsync(userId, cancellationToken);
            if (currentTier == SubscriptionNames.Enterprise)
                throw new InvalidOperationException("Account is already on the Enterprise plan.");

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException("User not found.");

            await _subscriptionRepository.UpgradeSubscriptionAsync(
                userId, SubscriptionNames.Enterprise, user.Email, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }
    }
}
