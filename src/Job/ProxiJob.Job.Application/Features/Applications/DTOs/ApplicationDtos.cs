namespace ProxiJob.Job.Application.Features.Applications.DTOs
{
    public class ApplicationDto
    {
        public int Id { get; set; }
        public int ShiftId { get; set; }
        public int StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? StudentSchool { get; set; }
        public string? StudentAvatarUrl { get; set; }
        public double StudentReputationScore { get; set; }
        public int StudentReviewCount { get; set; }
        public string? StudentMajor { get; set; }
        public string? StudentSkills { get; set; }
        public string? StudentBio { get; set; }
        public int StudentYearOfStudy { get; set; }
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
