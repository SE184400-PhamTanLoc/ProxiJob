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
        public List<string> SkillNames { get; set; } = new();
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

            // Resolve skills by name (create if they don't exist)
            var jobPostSkills = new List<JobPostSkill>();
            if (request.SkillNames != null && request.SkillNames.Any())
            {
                var skillNamesToProcess = request.SkillNames
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Select(name => name.Trim())
                    .Distinct()
                    .ToList();

                // Fetch existing skills matching these names (case-insensitive)
                var existingSkills = await _context.Skills
                    .Where(s => skillNamesToProcess.Any(n => s.Name.ToLower() == n.ToLower()))
                    .ToListAsync(cancellationToken);

                var existingSkillNames = existingSkills.Select(s => s.Name.ToLower()).ToList();
                var newSkillNames = skillNamesToProcess
                    .Where(n => !existingSkillNames.Contains(n.ToLower()))
                    .ToList();

                // Create new skills
                var newSkills = newSkillNames.Select(name => new Skill
                {
                    Name = name,
                    Description = "", // Avoid NOT NULL constraint violation in database
                    CreatedBy = request.CreatedBy,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                var allSkills = existingSkills.Concat(newSkills).ToList();

                jobPostSkills = allSkills.Select(skill => new JobPostSkill
                {
                    Skill = skill,
                    CreatedBy = request.CreatedBy,
                    CreatedAt = DateTime.UtcNow
                }).ToList();
            }

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
                JobPostSkills = jobPostSkills
            };

            _context.JobPosts.Add(jobPost);
            await _context.SaveChangesAsync(cancellationToken);

            return jobPost.Id;
        }
    }
}
