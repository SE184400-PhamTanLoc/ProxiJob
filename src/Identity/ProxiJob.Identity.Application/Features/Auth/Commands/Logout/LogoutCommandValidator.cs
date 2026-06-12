using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Logout
{
    public class LogoutCommandValidator : AbstractValidator<LogoutCommand>
    {
        public LogoutCommandValidator()
        {
            RuleFor(x => x.RefreshToken)
                .NotEmpty().WithMessage(ValidationMessages.RefreshTokenRequired);
        }
    }
}
