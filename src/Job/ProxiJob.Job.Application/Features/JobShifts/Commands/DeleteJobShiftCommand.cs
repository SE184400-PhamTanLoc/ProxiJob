using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobShifts.Commands
{
    public class DeleteJobShiftCommand : IRequest<bool>
    {
        public int Id { get; set; }
        public int JobPostId { get; set; }
        public int BusinessId { get; set; }
        public string DeletedBy { get; set; }
    }

    public class DeleteJobShiftCommandHandler : IRequestHandler<DeleteJobShiftCommand, bool>
    {
        private readonly IJobDbContext _context;

        public DeleteJobShiftCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(DeleteJobShiftCommand request, CancellationToken cancellationToken)
        {
            var shift = await _context.JobShifts
                .Include(s => s.JobPost)
                .Include(s => s.Applications)
                .FirstOrDefaultAsync(s => s.Id == request.Id && s.JobPostId == request.JobPostId, cancellationToken);

            if (shift == null || shift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Shift not found or you don't have permission.");

            if (shift.JobPost.Status == "Closed")
                throw new Exception("Cannot delete shift for a closed job post.");

            var hasApproved = shift.Applications?.Any(a => a.Status == "Approved") ?? false;
            if (hasApproved)
                throw new Exception("Cannot delete a shift that already has approved applications.");

            shift.IsDeleted = true;
            shift.DeletedAt = DateTime.UtcNow;
            shift.DeletedBy = request.DeletedBy;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
