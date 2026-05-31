using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Business.Commands.RegisterBusinessProfile
{
    public class RegisterBusinessProfileCommandValidator : AbstractValidator<RegisterBusinessProfileCommand>
    {
        public RegisterBusinessProfileCommandValidator()
        {
            RuleFor(x => x.PhoneNumber)
                .NotEmpty().WithMessage(ValidationMessages.PhoneInvalid)
                .Matches(@"^0\d{9}$").WithMessage(ValidationMessages.PhoneInvalid);

            RuleFor(x => x.BusinessName).NotEmpty().MaximumLength(200);
            RuleFor(x => x.BusinessType)
                .NotEmpty()
                .Must(t => BusinessTypes.All.Contains(t))
                .WithMessage(ValidationMessages.BusinessTypeInvalid);
            RuleFor(x => x.City).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.TaxCode)
                .Matches(@"^\d{10}(-\d{3})?$")
                .When(x => !string.IsNullOrWhiteSpace(x.TaxCode))
                .WithMessage(ValidationMessages.TaxCodeInvalid);
            RuleFor(x => x.Description)
                .NotEmpty().MinimumLength(20).MaximumLength(2000)
                .WithMessage(ValidationMessages.BusinessDescriptionMinLength);
            RuleFor(x => x.AvatarUrl).MaximumLength(500).When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl));
        }
    }
}
