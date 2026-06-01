using Microsoft.Extensions.Configuration;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Application.Services
{
    public static class StudentCvUrlResolver
    {
        /// <summary>
        /// CV = hồ sơ sinh viên (profile). Trả URL xem profile công khai cho Job Service lưu vào Application.CVUrl.
        /// </summary>
        public static string? Resolve(StudentProfile profile, User user, IConfiguration configuration)
        {
            var publicBaseUrl = configuration["Identity:PublicBaseUrl"]
                ?? configuration["PaymentSettings:PublicBaseUrl"]
                ?? configuration["PublicBaseUrl"];
            if (string.IsNullOrWhiteSpace(publicBaseUrl))
                return null;

            return $"{publicBaseUrl.TrimEnd('/')}/api/public/students/{user.Id}/cv";
        }
    }
}
