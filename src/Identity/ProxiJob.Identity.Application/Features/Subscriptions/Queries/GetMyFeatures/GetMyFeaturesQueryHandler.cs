using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetMyFeatures
{
    public class GetMyFeaturesQueryHandler : IRequestHandler<GetMyFeaturesQuery, MyFeaturesDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly IRoleRepository _roleRepository;
        private readonly ISubscriptionRepository _subscriptionRepository;

        public GetMyFeaturesQueryHandler(
            ICurrentUserService currentUser,
            IRoleRepository roleRepository,
            ISubscriptionRepository subscriptionRepository)
        {
            _currentUser = currentUser;
            _roleRepository = roleRepository;
            _subscriptionRepository = subscriptionRepository;
        }

        public async Task<MyFeaturesDto> Handle(GetMyFeaturesQuery request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException(BusinessMessages.NotAuthenticated);

            var role = await _roleRepository.GetUserRoleNameAsync(userId, cancellationToken) ?? RoleNames.Student;
            var (tier, limit) = await _subscriptionRepository.GetUserTierInfoAsync(userId, cancellationToken);

            var active = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
            decimal price = 0;
            DateTime? startDate = null;
            DateTime? endDate = null;
            var status = "None";
            var hasPriorityDisplay = false;
            var hasHrManagement = false;

            if (active != null)
            {
                var plan = await _subscriptionRepository.GetByIdAsync(active.SubscriptionId, cancellationToken);
                if (plan != null)
                {
                    price = plan.Price;
                    status = active.Status;
                    startDate = active.StartDate;
                    endDate = active.EndDate;
                    hasPriorityDisplay = plan.HasPriorityDisplay;
                    hasHrManagement = plan.HasHrManagement;
                }
            }

            return new MyFeaturesDto
            {
                Role = role,
                SubscriptionTier = tier,
                JobPostLimit = limit,
                Price = price,
                StartDate = startDate,
                EndDate = endDate,
                Status = status,
                HasPriorityDisplay = hasPriorityDisplay,
                HasHrManagement = hasHrManagement
            };
        }
    }
}
