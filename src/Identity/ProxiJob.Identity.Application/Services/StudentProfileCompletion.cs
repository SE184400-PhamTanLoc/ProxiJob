using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public static class StudentProfileCompletion
    {
        private static readonly (string Field, Func<User, StudentProfile, bool> IsFilled)[] Rules =
        {
            ("phoneNumber", (u, _) => !string.IsNullOrWhiteSpace(u.PhoneNumber)),
            ("dateOfBirth", (_, p) => p.DateOfBirth.HasValue),
            ("city", (_, p) => !string.IsNullOrWhiteSpace(p.City)),
            ("address", (_, p) => !string.IsNullOrWhiteSpace(p.Address)),
            ("school", (_, p) => !string.IsNullOrWhiteSpace(p.School)),
            ("major", (_, p) => !string.IsNullOrWhiteSpace(p.Major)),
            ("yearOfStudy", (_, p) => p.YearOfStudy is >= 1 and <= 6),
            ("bio", (_, p) => !string.IsNullOrWhiteSpace(p.Bio) && p.Bio.Trim().Length >= 20),
            ("skills", (_, p) => !string.IsNullOrWhiteSpace(p.Skills))
        };

        public static IReadOnlyList<string> GetMissingFields(User user, StudentProfile profile)
            => Rules.Where(r => !r.IsFilled(user, profile)).Select(r => r.Field).ToList();

        public static int GetCompletionPercent(User user, StudentProfile profile)
        {
            var filled = Rules.Count(r => r.IsFilled(user, profile));
            return (int)Math.Round(filled * 100.0 / Rules.Length);
        }

        public static bool IsComplete(User user, StudentProfile profile)
            => GetMissingFields(user, profile).Count == 0;
    }
}
