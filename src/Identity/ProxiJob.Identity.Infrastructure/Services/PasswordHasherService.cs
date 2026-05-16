using ProxiJob.Identity.Application.Common.Interfaces;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public class PasswordHasherService : IPasswordHasher
    {
        public string Hash(string password)
            => BCrypt.Net.BCrypt.HashPassword(password);

        public bool Verify(string password, string hash)
            => BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
