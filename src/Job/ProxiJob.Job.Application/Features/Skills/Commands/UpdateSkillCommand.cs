using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Skills.Commands
{
    public class UpdateSkillCommand : IRequest<bool>
    {
        public int SkillId { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class UpdateSkillCommandHandler : IRequestHandler<UpdateSkillCommand, bool>
    {
        private readonly IJobDbContext _context;

        public UpdateSkillCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateSkillCommand request, CancellationToken cancellationToken)
        {
            var skill = await _context.Skills
                .FirstOrDefaultAsync(s => s.Id == request.SkillId, cancellationToken);

            if (skill == null)
            {
                return false;
            }

            bool exists = await _context.Skills
                .AnyAsync(s => s.Id != request.SkillId && s.Name.ToLower() == request.Name.ToLower(), cancellationToken);
            
            if (exists)
            {
                throw new Exception("Skill name already exists.");
            }

            skill.Name = request.Name;
            skill.Description = request.Description;
            skill.UpdatedBy = request.UpdatedBy;
            skill.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
