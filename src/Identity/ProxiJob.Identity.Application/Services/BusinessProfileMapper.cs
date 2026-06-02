using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public static class BusinessProfileMapper
    {
        public static BusinessProfileDto ToDto(BusinessProfile profile)
        {
            var missing = BusinessProfileCompletion.GetMissingFields(profile.User, profile);
            return new BusinessProfileDto
            {
                UserId = profile.UserId,
                FullName = profile.User.FullName,
                Email = profile.User.Email,
                PhoneNumber = profile.User.PhoneNumber,
                AvatarUrl = profile.User.AvatarUrl,
                ReadinessStatus = profile.ReadinessStatus,
                BusinessName = profile.BusinessName,
                BusinessType = profile.BusinessType,
                Address = profile.Address,
                City = profile.City,
                TaxCode = profile.TaxCode,
                Description = profile.Description,
                ReputationScore = profile.ReputationScore,
                ReviewCount = profile.ReviewCount,
                ProfileCompleteAt = profile.ProfileCompleteAt,
                CompletionPercent = BusinessProfileCompletion.GetCompletionPercent(profile.User, profile),
                MissingFields = missing
            };
        }

        public static void ApplyFull(
            User user,
            BusinessProfile profile,
            string phoneNumber,
            string? avatarUrl,
            string businessName,
            string businessType,
            string address,
            string city,
            string? taxCode,
            string description)
        {
            user.PhoneNumber = phoneNumber.Trim();
            user.AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
            profile.BusinessName = businessName.Trim();
            profile.BusinessType = businessType.Trim();
            profile.Address = address.Trim();
            profile.City = city.Trim();
            profile.TaxCode = string.IsNullOrWhiteSpace(taxCode) ? null : taxCode.Trim();
            profile.Description = description.Trim();
        }

        public static bool IsRegistered(BusinessProfile profile)
            => !string.IsNullOrWhiteSpace(profile.User.PhoneNumber)
                && !string.IsNullOrWhiteSpace(profile.BusinessName);
    }
}
