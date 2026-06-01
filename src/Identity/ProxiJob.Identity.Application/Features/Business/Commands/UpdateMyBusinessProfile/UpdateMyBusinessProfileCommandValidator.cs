using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Constants;

namespace ProxiJob.Identity.Application.Features.Business.Commands.UpdateMyBusinessProfile
{
    public class UpdateMyBusinessProfileCommandValidator : AbstractValidator<UpdateMyBusinessProfileCommand>
    {
        public UpdateMyBusinessProfileCommandValidator()
        {
            RuleFor(x => x.PhoneNumber)
                .NotEmpty().When(x => x.PhoneNumber != null)
                .WithMessage(ValidationMessages.PhoneInvalid)
                .Matches(@"^0\d{9}$").When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber))
                .WithMessage(ValidationMessages.PhoneInvalid);

            RuleFor(x => x.BusinessName)
                .NotEmpty().When(x => x.BusinessName != null)
                .MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.BusinessName));

            RuleFor(x => x.BusinessType)
                .Must(t => string.IsNullOrWhiteSpace(t) || BusinessTypes.All.Contains(t))
                .When(x => x.BusinessType != null)
                .WithMessage(ValidationMessages.BusinessTypeInvalid);

            RuleFor(x => x.City)
                .NotEmpty().When(x => x.City != null)
                .MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.City));

            RuleFor(x => x.Address)
                .NotEmpty().When(x => x.Address != null)
                .MaximumLength(300).When(x => !string.IsNullOrWhiteSpace(x.Address));

            RuleFor(x => x.TaxCode)
                .Matches(@"^\d{10}(-\d{3})?$")
                .When(x => !string.IsNullOrWhiteSpace(x.TaxCode))
                .WithMessage(ValidationMessages.TaxCodeInvalid);

            RuleFor(x => x.Description)
                .MinimumLength(20).When(x => !string.IsNullOrWhiteSpace(x.Description))
                .WithMessage(ValidationMessages.BusinessDescriptionMinLength)
                .MaximumLength(2000).When(x => !string.IsNullOrWhiteSpace(x.Description));

            RuleFor(x => x.AvatarUrl)
                .MaximumLength(500).When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl));
        }
    }
}
