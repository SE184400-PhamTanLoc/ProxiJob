using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Features.JobPosts.DTOs;
using ProxiJob.Job.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobPosts.Commands
{
    public class CreateJobPostCommand : IRequest<int>
    {
        public int BusinessId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public int CategoryId { get; set; }
        public LocationDto Location { get; set; }
        public List<int> SkillIds { get; set; } = new();
        public string CreatedBy { get; set; }
    }

    public class CreateJobPostCommandHandler : IRequestHandler<CreateJobPostCommand, int>
    {
        private readonly IJobDbContext _context;

        public CreateJobPostCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateJobPostCommand request, CancellationToken cancellationToken)
        {
            // Validate category
            var categoryExists = await _context.JobCategories.AnyAsync(c => c.Id == request.CategoryId, cancellationToken);
            if (!categoryExists) throw new Exception("Category does not exist.");

            // Create JobPost
            var jobPost = new JobPost
            {
                BusinessId = request.BusinessId,
                Title = request.Title,
                Description = request.Description,
                Requirements = request.Requirements,
                CategoryId = request.CategoryId,
                Status = "Draft",
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.UtcNow,
                Location = new JobLocation
                {
                    Address = request.Location.Address,
                    Latitude = request.Location.Latitude,
                    Longitude = request.Location.Longitude,
                    CreatedBy = request.CreatedBy,
                    CreatedAt = DateTime.UtcNow
                },
                JobPostSkills = request.SkillIds.Select(skillId => new JobPostSkill
                {
                    SkillId = skillId,
                    CreatedBy = request.CreatedBy,
                    CreatedAt = DateTime.UtcNow
                }).ToList()
            };

            _context.JobPosts.Add(jobPost);
            await _context.SaveChangesAsync(cancellationToken);

            return jobPost.Id;
        }
    }
}
