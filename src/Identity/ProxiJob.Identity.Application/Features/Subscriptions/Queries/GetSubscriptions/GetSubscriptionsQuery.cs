using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetSubscriptions
{
    public record GetSubscriptionsQuery : IRequest<IReadOnlyList<SubscriptionDto>>;
}
