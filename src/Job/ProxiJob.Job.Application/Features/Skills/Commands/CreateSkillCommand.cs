using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Skills.Commands
{
    public class CreateSkillCommand : IRequest<int>
    {
        public string Name { get; set; }
        public string? Description { get; set; }
        public string CreatedBy { get; set; }
    }

    public class CreateSkillCommandHandler : IRequestHandler<CreateSkillCommand, int>
    {
        private readonly IJobDbContext _context;

        public CreateSkillCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateSkillCommand request, CancellationToken cancellationToken)
        {
            // Business Rule: No duplicate name
            bool exists = await _context.Skills
                .AnyAsync(s => s.Name.ToLower() == request.Name.ToLower(), cancellationToken);
            
            if (exists)
            {
                throw new Exception("Skill name already exists.");
            }

            var skill = new Skill
            {
                Name = request.Name,
                Description = request.Description,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.UtcNow
            };

            _context.Skills.Add(skill);
            await _context.SaveChangesAsync(cancellationToken);

            return skill.Id;
        }
    }
}
