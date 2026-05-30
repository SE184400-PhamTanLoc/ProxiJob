using System.Security.Cryptography;
using System.Text;

namespace ProxiJob.Identity.Infrastructure.Payments
{
    internal static class PaymentHashHelper
    {
        public static string HmacSha512(string key, string data)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            using var hmac = new HMACSHA512(keyBytes);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        public static string HmacSha256(string key, string data)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        public static string BuildQueryString(IEnumerable<KeyValuePair<string, string>> parameters)
            => string.Join("&", parameters
                .Where(p => !string.IsNullOrEmpty(p.Value))
                .OrderBy(p => p.Key)
                .Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
    }
}
