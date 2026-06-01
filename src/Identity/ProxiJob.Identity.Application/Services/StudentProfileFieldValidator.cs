using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Models;
using System.Text.RegularExpressions;

namespace ProxiJob.Identity.Application.Services
{
    public static class StudentProfileFieldValidator
    {
        private static readonly Regex PhoneRegex = new(@"^0\d{9}$", RegexOptions.Compiled);
        private static readonly HashSet<string> AllowedGenders = new(StringComparer.OrdinalIgnoreCase)
        {
            "Nam", "Nữ", "Khac", "Khác"
        };

        public static IReadOnlyList<string> Validate(User user, StudentProfile profile)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(user.PhoneNumber) || !PhoneRegex.IsMatch(user.PhoneNumber))
                errors.Add(ValidationMessages.PhoneInvalid);

            if (!profile.DateOfBirth.HasValue)
                errors.Add(ValidationMessages.DateOfBirthRequired);
            else if (!IsValidDateOfBirth(profile.DateOfBirth.Value))
                errors.Add(ValidationMessages.DateOfBirthInvalid);

            if (string.IsNullOrWhiteSpace(profile.City))
                errors.Add(ValidationMessages.CityRequired);
            else if (profile.City.Length > 100)
                errors.Add(ValidationMessages.CityMaxLength);

            if (string.IsNullOrWhiteSpace(profile.Address))
                errors.Add(ValidationMessages.AddressRequired);
            else if (profile.Address.Length > 300)
                errors.Add(ValidationMessages.AddressMaxLength);

            if (string.IsNullOrWhiteSpace(profile.School))
                errors.Add(ValidationMessages.SchoolRequired);
            else if (profile.School.Length > 200)
                errors.Add(ValidationMessages.SchoolMaxLength);

            if (string.IsNullOrWhiteSpace(profile.Major))
                errors.Add(ValidationMessages.MajorRequired);
            else if (profile.Major.Length > 150)
                errors.Add(ValidationMessages.MajorMaxLength);

            if (profile.YearOfStudy is < 1 or > 6)
                errors.Add(ValidationMessages.YearOfStudyInvalid);

            if (string.IsNullOrWhiteSpace(profile.Bio) || profile.Bio.Trim().Length < 20)
                errors.Add(ValidationMessages.BioMinLength);
            else if (profile.Bio.Length > 2000)
                errors.Add(ValidationMessages.BioMaxLength);

            if (string.IsNullOrWhiteSpace(profile.Skills))
                errors.Add(ValidationMessages.SkillsRequired);
            else if (profile.Skills.Length > 500)
                errors.Add(ValidationMessages.SkillsMaxLength);

            if (!string.IsNullOrWhiteSpace(profile.Gender) && !AllowedGenders.Contains(profile.Gender.Trim()))
                errors.Add(ValidationMessages.GenderInvalid);

            if (!string.IsNullOrWhiteSpace(user.AvatarUrl) && user.AvatarUrl.Length > 500)
                errors.Add(ValidationMessages.AvatarUrlMaxLength);

            return errors;
        }

        public static bool IsValidDateOfBirth(DateTime dateOfBirth)
        {
            var dob = dateOfBirth.Date;
            var today = DateTime.UtcNow.Date;
            if (dob > today)
                return false;

            var age = today.Year - dob.Year;
            if (dob > today.AddYears(-age))
                age--;

            return age is >= 16 and <= 60;
        }
    }
}
