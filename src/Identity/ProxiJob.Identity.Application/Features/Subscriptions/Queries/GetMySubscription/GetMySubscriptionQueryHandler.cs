using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetMySubscription
{
    public class GetMySubscriptionQueryHandler : IRequestHandler<GetMySubscriptionQuery, UserSubscriptionDto>
    {
        private readonly ICurrentUserService _currentUser;
        private readonly ISubscriptionRepository _subscriptionRepository;

        public GetMySubscriptionQueryHandler(
            ICurrentUserService currentUser,
            ISubscriptionRepository subscriptionRepository)
        {
            _currentUser = currentUser;
            _subscriptionRepository = subscriptionRepository;
        }

        public async Task<UserSubscriptionDto> Handle(GetMySubscriptionQuery request, CancellationToken cancellationToken)
        {
            if (_currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException("User is not authenticated.");

            var active = await _subscriptionRepository.GetActiveByUserIdAsync(userId, cancellationToken);
            if (active == null)
            {
                return new UserSubscriptionDto
                {
                    PlanName = SubscriptionNames.Free,
                    Price = 0,
                    JobPostLimit = 0,
                    StartDate = DateTime.UtcNow,
                    EndDate = DateTime.UtcNow,
                    Status = "None"
                };
            }

            var plan = await _subscriptionRepository.GetByIdAsync(active.SubscriptionId, cancellationToken)
                ?? throw new InvalidOperationException("Active subscription plan not found.");

            return new UserSubscriptionDto
            {
                PlanName = plan.Name,
                Price = plan.Price,
                JobPostLimit = plan.JobPostLimit,
                StartDate = active.StartDate,
                EndDate = active.EndDate,
                Status = active.Status
            };
        }
    }
}
