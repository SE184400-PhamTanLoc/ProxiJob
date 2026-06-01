using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetPlanComparison
{
    public record GetPlanComparisonQuery : IRequest<IReadOnlyList<PlanComparisonDto>>;
}
