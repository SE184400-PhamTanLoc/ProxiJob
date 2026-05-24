using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Features.JobPosts.DTOs;
using ProxiJob.Job.Application.Features.Skills.DTOs;
using ProxiJob.Job.Application.Features.JobShifts.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobPosts.Queries
{
    public class GetJobPostByIdQuery : IRequest<JobPostDetailDto>
    {
        public int Id { get; set; }
    }

    public class GetJobPostByIdQueryHandler : IRequestHandler<GetJobPostByIdQuery, JobPostDetailDto>
    {
        private readonly IJobDbContext _context;

        public GetJobPostByIdQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<JobPostDetailDto> Handle(GetJobPostByIdQuery request, CancellationToken cancellationToken)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.Category)
                .Include(j => j.Location)
                .Include(j => j.JobPostSkills).ThenInclude(js => js.Skill)
                .Include(j => j.Shifts)
                .FirstOrDefaultAsync(j => j.Id == request.Id, cancellationToken);

            if (jobPost == null) return null;

            return new JobPostDetailDto
            {
                Id = jobPost.Id,
                Title = jobPost.Title,
                Description = jobPost.Description,
                Requirements = jobPost.Requirements,
                Status = jobPost.Status,
                CategoryName = jobPost.Category?.Name,
                CreatedAt = jobPost.CreatedAt,
                CreatedBy = jobPost.CreatedBy,
                Location = jobPost.Location == null ? null : new LocationDto
                {
                    Address = jobPost.Location.Address,
                    Latitude = jobPost.Location.Latitude,
                    Longitude = jobPost.Location.Longitude
                },
                Skills = jobPost.JobPostSkills.Select(js => new SkillDto
                {
                    Id = js.Skill.Id,
                    Name = js.Skill.Name,
                    Description = js.Skill.Description
                }).ToList(),
                Shifts = jobPost.Shifts.Select(s => new JobShiftDto
                {
                    Id = s.Id,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Salary = s.Salary,
                    Slots = s.Slots,
                    RemainingSlots = s.RemainingSlots
                }).ToList()
            };
        }
    }
}
