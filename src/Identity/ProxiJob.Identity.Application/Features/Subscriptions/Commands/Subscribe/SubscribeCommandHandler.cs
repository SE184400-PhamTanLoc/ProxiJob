using MediatR;
using ProxiJob.Identity.Application.Common.Exceptions;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.Subscribe
{
    public class SubscribeCommandHandler : IRequestHandler<SubscribeCommand, AuthTokensDto>
    {
        private readonly IAuthRepository _authRepository;
        private readonly ICurrentUserService _currentUser;
        private readonly ISubscriptionRepository _subscriptionRepository;
        private readonly IAuthSessionService _authSessionService;
        private readonly IUnitOfWork _unitOfWork;

        public SubscribeCommandHandler(
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

        public async Task<AuthTokensDto> Handle(SubscribeCommand request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);

            if (_currentUser.Role != RoleNames.Business)
                throw new ForbiddenAccessException(BusinessMessages.BusinessSubscribeOnly);

            var active = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
            if (active?.SubscriptionId == request.PlanId)
                throw new InvalidOperationException(BusinessMessages.AlreadyOnPlan);

            var user = await _authRepository.GetUserByIdAsync(userId, cancellationToken)
                ?? throw new UnauthorizedAccessException(BusinessMessages.UserNotFound);

            // TODO: tích hợp thanh toán trước khi kích hoạt gói
            await _subscriptionRepository.SubscribeToPlanByIdAsync(
                userId, request.PlanId, user.Email, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return await _authSessionService.IssueSessionAsync(user, cancellationToken);
        }
    }
}
