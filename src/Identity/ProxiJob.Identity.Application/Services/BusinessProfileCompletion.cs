using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public static class BusinessProfileCompletion
    {
        private static readonly (string Field, Func<User, BusinessProfile, bool> IsFilled)[] Rules =
        {
            ("phoneNumber", (u, _) => !string.IsNullOrWhiteSpace(u.PhoneNumber)),
            ("businessName", (_, p) => !string.IsNullOrWhiteSpace(p.BusinessName)),
            ("businessType", (_, p) => !string.IsNullOrWhiteSpace(p.BusinessType)),
            ("city", (_, p) => !string.IsNullOrWhiteSpace(p.City)),
            ("address", (_, p) => !string.IsNullOrWhiteSpace(p.Address)),
            ("description", (_, p) => !string.IsNullOrWhiteSpace(p.Description) && p.Description.Trim().Length >= 20)
        };

        public static IReadOnlyList<string> GetMissingFields(User user, BusinessProfile profile)
            => Rules.Where(r => !r.IsFilled(user, profile)).Select(r => r.Field).ToList();

        public static int GetCompletionPercent(User user, BusinessProfile profile)
        {
            var filled = Rules.Count(r => r.IsFilled(user, profile));
            return (int)Math.Round(filled * 100.0 / Rules.Length);
        }

        public static bool IsComplete(User user, BusinessProfile profile)
            => GetMissingFields(user, profile).Count == 0;
    }
}
