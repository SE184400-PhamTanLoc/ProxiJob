namespace ProxiJob.Identity.Application.DTOs
{
    public class AuthTokensDto
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public DateTime Expiration { get; set; }
    }
}
