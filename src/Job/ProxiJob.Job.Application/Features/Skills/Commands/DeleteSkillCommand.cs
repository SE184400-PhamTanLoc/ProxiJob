using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Skills.Commands
{
    public class DeleteSkillCommand : IRequest<bool>
    {
        public int SkillId { get; set; }
        public string DeletedBy { get; set; }
    }

    public class DeleteSkillCommandHandler : IRequestHandler<DeleteSkillCommand, bool>
    {
        private readonly IJobDbContext _context;

        public DeleteSkillCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteSkillCommand request, CancellationToken cancellationToken)
        {
            var skill = await _context.Skills
                .FirstOrDefaultAsync(s => s.Id == request.SkillId, cancellationToken);

            if (skill == null)
            {
                return false;
            }

            skill.IsDeleted = true;
            skill.DeletedAt = DateTime.UtcNow;
            skill.DeletedBy = request.DeletedBy;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
