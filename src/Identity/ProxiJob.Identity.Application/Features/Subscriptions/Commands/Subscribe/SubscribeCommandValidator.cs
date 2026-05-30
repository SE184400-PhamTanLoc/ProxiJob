using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.Subscribe
{
    public class SubscribeCommandValidator : AbstractValidator<SubscribeCommand>
    {
        public SubscribeCommandValidator()
        {
            RuleFor(x => x.PlanId)
                .GreaterThan(0).WithMessage(BusinessMessages.PlanIdRequired);

            RuleFor(x => x.Gateway)
                .NotEmpty().WithMessage(BusinessMessages.GatewayRequired)
                .Must(g => PaymentGatewayNames.TryParse(g, out _))
                .WithMessage(BusinessMessages.InvalidGateway);
        }
    }
}
