using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public static class StudentProfileMapper
    {
        public static StudentProfileDto ToDto(StudentProfile profile)
        {
            var missing = StudentProfileCompletion.GetMissingFields(profile.User, profile);
            return new StudentProfileDto
            {
                UserId = profile.UserId,
                FullName = profile.User.FullName,
                Email = profile.User.Email,
                PhoneNumber = profile.User.PhoneNumber,
                AvatarUrl = profile.User.AvatarUrl,
                ReadinessStatus = profile.ReadinessStatus,
                DateOfBirth = profile.DateOfBirth,
                Gender = profile.Gender,
                Address = profile.Address,
                City = profile.City,
                Latitude = profile.Latitude,
                Longitude = profile.Longitude,
                School = profile.School,
                Major = profile.Major,
                YearOfStudy = profile.YearOfStudy,
                Bio = profile.Bio,
                Skills = profile.Skills,
                ReputationScore = profile.ReputationScore,
                ReviewCount = profile.ReviewCount,
                ReadyForWorkAt = profile.ReadyForWorkAt,
                CompletionPercent = StudentProfileCompletion.GetCompletionPercent(profile.User, profile),
                MissingFields = missing
            };
        }

        public static void ApplyFull(
            User user,
            StudentProfile profile,
            string phoneNumber,
            string? avatarUrl,
            DateTime dateOfBirth,
            string? gender,
            string address,
            string city,
            double? latitude,
            double? longitude,
            string school,
            string major,
            int yearOfStudy,
            string bio,
            string skills)
        {
            user.PhoneNumber = phoneNumber.Trim();
            user.AvatarUrl = string.IsNullOrWhiteSpace(avatarUrl) ? null : avatarUrl.Trim();
            profile.DateOfBirth = dateOfBirth;
            profile.Gender = string.IsNullOrWhiteSpace(gender) ? null : gender.Trim();
            profile.Address = address.Trim();
            profile.City = city.Trim();
            profile.Latitude = latitude;
            profile.Longitude = longitude;
            profile.School = school.Trim();
            profile.Major = major.Trim();
            profile.YearOfStudy = yearOfStudy;
            profile.Bio = bio.Trim();
            profile.Skills = skills.Trim();
        }

        public static bool IsRegistered(StudentProfile profile)
            => !string.IsNullOrWhiteSpace(profile.User.PhoneNumber)
                && !string.IsNullOrWhiteSpace(profile.School);
    }
}
