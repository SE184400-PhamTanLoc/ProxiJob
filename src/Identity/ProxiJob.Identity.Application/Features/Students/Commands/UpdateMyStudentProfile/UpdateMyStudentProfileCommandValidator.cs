using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.Services;

namespace ProxiJob.Identity.Application.Features.Students.Commands.UpdateMyStudentProfile
{
    public class UpdateMyStudentProfileCommandValidator : AbstractValidator<UpdateMyStudentProfileCommand>
    {
        public UpdateMyStudentProfileCommandValidator()
        {
            RuleFor(x => x.PhoneNumber)
                .NotEmpty().When(x => x.PhoneNumber != null)
                .WithMessage(ValidationMessages.PhoneInvalid)
                .Matches(@"^0\d{9}$").When(x => !string.IsNullOrWhiteSpace(x.PhoneNumber))
                .WithMessage(ValidationMessages.PhoneInvalid);

            RuleFor(x => x.DateOfBirth)
                .Must(d => d.HasValue && StudentProfileFieldValidator.IsValidDateOfBirth(d.Value))
                .When(x => x.DateOfBirth.HasValue)
                .WithMessage(ValidationMessages.DateOfBirthInvalid);

            RuleFor(x => x.Gender)
                .Must(g => string.IsNullOrWhiteSpace(g) || g is "Nam" or "Nữ" or "Khac" or "Khác")
                .When(x => x.Gender != null)
                .WithMessage(ValidationMessages.GenderInvalid);

            RuleFor(x => x.City)
                .NotEmpty().When(x => x.City != null)
                .MaximumLength(100).When(x => !string.IsNullOrWhiteSpace(x.City));

            RuleFor(x => x.Address)
                .NotEmpty().When(x => x.Address != null)
                .MaximumLength(300).When(x => !string.IsNullOrWhiteSpace(x.Address));

            RuleFor(x => x.School)
                .NotEmpty().When(x => x.School != null)
                .MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.School));

            RuleFor(x => x.Major)
                .NotEmpty().When(x => x.Major != null)
                .MaximumLength(150).When(x => !string.IsNullOrWhiteSpace(x.Major));

            RuleFor(x => x.YearOfStudy)
                .InclusiveBetween(1, 6).When(x => x.YearOfStudy.HasValue)
                .WithMessage(ValidationMessages.YearOfStudyInvalid);

            RuleFor(x => x.Bio)
                .MinimumLength(20).When(x => !string.IsNullOrWhiteSpace(x.Bio))
                .WithMessage(ValidationMessages.BioMinLength)
                .MaximumLength(2000).When(x => !string.IsNullOrWhiteSpace(x.Bio));

            RuleFor(x => x.Skills)
                .NotEmpty().When(x => x.Skills != null)
                .MaximumLength(500).When(x => !string.IsNullOrWhiteSpace(x.Skills));

            RuleFor(x => x.AvatarUrl)
                .MaximumLength(500).When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl));
        }
    }
}
