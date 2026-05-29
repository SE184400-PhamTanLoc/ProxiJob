using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetSubscriptions
{
    public class GetSubscriptionsQueryHandler : IRequestHandler<GetSubscriptionsQuery, IReadOnlyList<SubscriptionDto>>
    {
        private readonly ISubscriptionRepository _subscriptionRepository;

        public GetSubscriptionsQueryHandler(ISubscriptionRepository subscriptionRepository)
            => _subscriptionRepository = subscriptionRepository;

        public async Task<IReadOnlyList<SubscriptionDto>> Handle(GetSubscriptionsQuery request, CancellationToken cancellationToken)
        {
            var plans = await _subscriptionRepository.GetAllAsync(cancellationToken);
            return plans.Select(p => new SubscriptionDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                JobPostLimit = p.JobPostLimit,
                DurationDays = p.DurationDays
            }).ToList();
        }
    }
}
