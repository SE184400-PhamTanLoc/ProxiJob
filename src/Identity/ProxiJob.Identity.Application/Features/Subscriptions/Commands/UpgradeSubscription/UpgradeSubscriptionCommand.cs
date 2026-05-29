using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.UpgradeSubscription
{
    public record UpgradeSubscriptionCommand : IRequest<AuthResponseDto>;
}
