using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Features.JobPosts.DTOs;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using ProxiJob.Shared.Contract.Events;

namespace ProxiJob.Job.Application.Features.JobPosts.Commands
{
    public class UpdateJobPostCommand : IRequest<bool>
    {
        public int Id { get; set; }
        public int BusinessId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public int CategoryId { get; set; }
        public LocationDto Location { get; set; }
        public List<int> SkillIds { get; set; } = new();
        public string UpdatedBy { get; set; }
    }

    public class UpdateJobPostCommandHandler : IRequestHandler<UpdateJobPostCommand, bool>
    {
        private readonly IJobDbContext _context;
        private readonly IPublishEndpoint _publishEndpoint;

        public UpdateJobPostCommandHandler(IJobDbContext context, IPublishEndpoint publishEndpoint)
        {
            _context = context;
            _publishEndpoint = publishEndpoint;
        }

        public async Task<bool> Handle(UpdateJobPostCommand request, CancellationToken cancellationToken)
        {
            var jobPost = await _context.JobPosts
                .Include(j => j.Location)
                .Include(j => j.JobPostSkills)
                .FirstOrDefaultAsync(j => j.Id == request.Id && j.BusinessId == request.BusinessId, cancellationToken);

            if (jobPost == null) throw new Exception("JobPost not found or you don't have permission.");

            if (jobPost.Status != "Draft" && jobPost.Status != "Published") throw new Exception("Only Draft or Published job posts can be updated.");

            var categoryExists = await _context.JobCategories.AnyAsync(c => c.Id == request.CategoryId, cancellationToken);
            if (!categoryExists) throw new Exception("Category does not exist.");

            jobPost.Title = request.Title;
            jobPost.Description = request.Description;
            jobPost.Requirements = request.Requirements;
            jobPost.CategoryId = request.CategoryId;
            jobPost.UpdatedBy = request.UpdatedBy;
            jobPost.UpdatedAt = DateTime.UtcNow;

            if (jobPost.Location != null)
            {
                jobPost.Location.Address = request.Location.Address;
                jobPost.Location.Latitude = request.Location.Latitude;
                jobPost.Location.Longitude = request.Location.Longitude;
                jobPost.Location.UpdatedBy = request.UpdatedBy;
                jobPost.Location.UpdatedAt = DateTime.UtcNow;
            }
            else 
            {
                jobPost.Location = new Domain.Models.JobLocation 
                {
                    Address = request.Location.Address,
                    Latitude = request.Location.Latitude,
                    Longitude = request.Location.Longitude,
                    CreatedBy = request.UpdatedBy,
                    CreatedAt = DateTime.UtcNow
                };
            }

            // Update skills (remove old, add new)
            _context.JobPostSkills.RemoveRange(jobPost.JobPostSkills);
            jobPost.JobPostSkills = request.SkillIds.Select(skillId => new Domain.Models.JobPostSkill
            {
                SkillId = skillId,
                CreatedBy = request.UpdatedBy,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            if (jobPost.Status == "Published")
            {
                var approvedStudentIds = await _context.Applications
                    .Where(a => a.JobShift.JobPostId == jobPost.Id && a.Status == "Approved")
                    .Select(a => a.StudentId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                try 
                {
                    await _publishEndpoint.Publish(new JobUpdatedEvent(
                        jobPost.Id,
                        jobPost.Title,
                        approvedStudentIds
                    ), cancellationToken);
                }
                catch 
                {
                    // Ignore
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
