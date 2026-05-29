using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetMySubscription
{
    public record GetMySubscriptionQuery : IRequest<UserSubscriptionDto>;
}
