using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.Subscribe
{
    public record SubscribeCommand(int PlanId) : IRequest<PurchasePlanResponseDto>;
}
