namespace ProxiJob.Job.Application.Features.Applications.DTOs
{
    public class ApplicationDto
    {
        public int Id { get; set; }
        public int ShiftId { get; set; }
        public DateTime ShiftStartTime { get; set; }
        public DateTime ShiftEndTime { get; set; }
        public decimal Salary { get; set; }
        public string JobTitle { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ApplicationHistoryDto
    {
        public string Status { get; set; }
        public string Note { get; set; }
        public DateTime ChangedAt { get; set; }
    }

    public class ApplicationDetailDto : ApplicationDto
    {
        public string Introduction { get; set; }
        public string CVUrl { get; set; }
        public List<ApplicationHistoryDto> Histories { get; set; } = new();
    }
}
