using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Commands.Subscribe
{
    public class SubscribeCommandValidator : AbstractValidator<SubscribeCommand>
    {
        public SubscribeCommandValidator()
        {
            RuleFor(x => x.PlanId)
                .GreaterThan(0).WithMessage(BusinessMessages.PlanIdRequired);
        }
    }
}
