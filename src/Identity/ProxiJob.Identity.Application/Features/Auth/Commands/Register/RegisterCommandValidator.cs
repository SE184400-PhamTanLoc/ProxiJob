using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Enums;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Register
{
    public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
    {
        public RegisterCommandValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage(ValidationMessages.FullNameRequired);

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage(ValidationMessages.EmailRequired)
                .EmailAddress().WithMessage(ValidationMessages.EmailInvalid);

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage(ValidationMessages.PasswordRequired)
                .MinimumLength(8).WithMessage(ValidationMessages.PasswordMinLength);

            RuleFor(x => x.ConfirmPassword)
                .NotEmpty().WithMessage(ValidationMessages.ConfirmPasswordRequired)
                .Equal(x => x.Password).WithMessage(ValidationMessages.PasswordsDoNotMatch);

            RuleFor(x => x.UserType)
                .IsInEnum().WithMessage(ValidationMessages.UserTypeInvalid);
        }
    }
}
