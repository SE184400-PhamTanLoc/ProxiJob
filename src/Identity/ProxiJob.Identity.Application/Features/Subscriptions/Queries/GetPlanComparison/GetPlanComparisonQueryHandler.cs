using MediatR;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetPlanComparison
{
    public class GetPlanComparisonQueryHandler : IRequestHandler<GetPlanComparisonQuery, IReadOnlyList<PlanComparisonDto>>
    {
        private readonly ISubscriptionRepository _subscriptionRepository;

        public GetPlanComparisonQueryHandler(ISubscriptionRepository subscriptionRepository)
            => _subscriptionRepository = subscriptionRepository;

        public Task<IReadOnlyList<PlanComparisonDto>> Handle(GetPlanComparisonQuery request, CancellationToken cancellationToken)
            => _subscriptionRepository.GetPlanComparisonAsync(cancellationToken);
    }
}
