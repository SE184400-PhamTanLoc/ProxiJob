namespace ProxiJob.Job.Application.Features.JobPosts.DTOs
{
    public class JobPostSummaryDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Status { get; set; }
        public string CategoryName { get; set; }
        public string Address { get; set; }
        public int ShiftCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
