using ProxiJob.Job.Application.Features.Skills.DTOs;
using ProxiJob.Job.Application.Features.JobShifts.DTOs;

namespace ProxiJob.Job.Application.Features.JobPosts.DTOs
{
    public class JobPostDetailDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public string Status { get; set; }
        public string CategoryName { get; set; }
        public LocationDto Location { get; set; }
        public List<SkillDto> Skills { get; set; } = new();
        public List<JobShiftDto> Shifts { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
    }

    public class LocationDto
    {
        public string Address { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
