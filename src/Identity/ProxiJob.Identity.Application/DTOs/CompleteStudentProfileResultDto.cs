namespace ProxiJob.Identity.Application.DTOs
{
    public class CompleteStudentProfileResultDto
    {
        public string Message { get; set; }
        public string ReadinessStatus { get; set; }
        public AuthTokensDto Tokens { get; set; }
    }
}
