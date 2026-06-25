namespace ProxiJob.Job.Application.Features.JobPosts.DTOs
{
    public class JobPostSummaryDto
    {
        public int Id { get; set; }
        public int BusinessId { get; set; }
        public string Title { get; set; }
        public string Status { get; set; }
        public string CategoryName { get; set; }
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public int ShiftCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
