namespace ProxiJob.Identity.Application.DTOs
{
    public class CompleteBusinessProfileResultDto
    {
        public string Message { get; set; } = "";
        public string ReadinessStatus { get; set; } = "";
        public AuthTokensDto Tokens { get; set; } = null!;
    }
}
