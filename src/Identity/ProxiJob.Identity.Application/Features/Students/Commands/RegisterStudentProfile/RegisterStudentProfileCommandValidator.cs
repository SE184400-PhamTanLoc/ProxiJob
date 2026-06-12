using FluentValidation;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.Services;

namespace ProxiJob.Identity.Application.Features.Students.Commands.RegisterStudentProfile
{
    public class RegisterStudentProfileCommandValidator : AbstractValidator<RegisterStudentProfileCommand>
    {
        public RegisterStudentProfileCommandValidator()
        {
            RuleFor(x => x.PhoneNumber)
                .NotEmpty().WithMessage(ValidationMessages.PhoneInvalid)
                .Matches(@"^0\d{9}$").WithMessage(ValidationMessages.PhoneInvalid);

            RuleFor(x => x.DateOfBirth)
                .Must(StudentProfileFieldValidator.IsValidDateOfBirth)
                .WithMessage(ValidationMessages.DateOfBirthInvalid);

            RuleFor(x => x.Gender)
                .Must(g => string.IsNullOrWhiteSpace(g) || g is "Nam" or "Nữ" or "Khac" or "Khác")
                .WithMessage(ValidationMessages.GenderInvalid);

            RuleFor(x => x.City).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Address).NotEmpty().MaximumLength(300);
            RuleFor(x => x.School).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Major).NotEmpty().MaximumLength(150);
            RuleFor(x => x.YearOfStudy).InclusiveBetween(1, 6).WithMessage(ValidationMessages.YearOfStudyInvalid);
            RuleFor(x => x.Bio).NotEmpty().MinimumLength(20).MaximumLength(2000)
                .WithMessage(ValidationMessages.BioMinLength);
            RuleFor(x => x.Skills).NotEmpty().MaximumLength(500);
            RuleFor(x => x.AvatarUrl).MaximumLength(500).When(x => !string.IsNullOrWhiteSpace(x.AvatarUrl));
        }
    }
}
