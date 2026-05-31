using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;
using System.Text.RegularExpressions;

namespace ProxiJob.Identity.Application.Services
{
    public static class BusinessProfileFieldValidator
    {
        private static readonly Regex PhoneRegex = new(@"^0\d{9}$", RegexOptions.Compiled);
        private static readonly Regex TaxCodeRegex = new(@"^\d{10}(-\d{3})?$", RegexOptions.Compiled);

        public static IReadOnlyList<string> Validate(User user, BusinessProfile profile)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(user.PhoneNumber) || !PhoneRegex.IsMatch(user.PhoneNumber))
                errors.Add(ValidationMessages.PhoneInvalid);

            if (string.IsNullOrWhiteSpace(profile.BusinessName))
                errors.Add(ValidationMessages.BusinessNameRequired);
            else if (profile.BusinessName.Length > 200)
                errors.Add(ValidationMessages.BusinessNameMaxLength);

            if (string.IsNullOrWhiteSpace(profile.BusinessType))
                errors.Add(ValidationMessages.BusinessTypeRequired);
            else if (!BusinessTypes.All.Contains(profile.BusinessType))
                errors.Add(ValidationMessages.BusinessTypeInvalid);

            if (string.IsNullOrWhiteSpace(profile.City))
                errors.Add(ValidationMessages.CityRequired);
            else if (profile.City.Length > 100)
                errors.Add(ValidationMessages.CityMaxLength);

            if (string.IsNullOrWhiteSpace(profile.Address))
                errors.Add(ValidationMessages.AddressRequired);
            else if (profile.Address.Length > 300)
                errors.Add(ValidationMessages.AddressMaxLength);

            if (string.IsNullOrWhiteSpace(profile.Description) || profile.Description.Trim().Length < 20)
                errors.Add(ValidationMessages.BusinessDescriptionMinLength);
            else if (profile.Description.Length > 2000)
                errors.Add(ValidationMessages.BusinessDescriptionMaxLength);

            if (!string.IsNullOrWhiteSpace(profile.TaxCode) && !TaxCodeRegex.IsMatch(profile.TaxCode.Trim()))
                errors.Add(ValidationMessages.TaxCodeInvalid);

            if (!string.IsNullOrWhiteSpace(user.AvatarUrl) && user.AvatarUrl.Length > 500)
                errors.Add(ValidationMessages.AvatarUrlMaxLength);

            return errors;
        }
    }
}
