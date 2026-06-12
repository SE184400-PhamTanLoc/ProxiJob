using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken
{
    public class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
    {
        public RefreshTokenCommandValidator()
        {
            RuleFor(x => x.RefreshToken)
                .NotEmpty().WithMessage(ValidationMessages.RefreshTokenRequired);
        }
    }
}
