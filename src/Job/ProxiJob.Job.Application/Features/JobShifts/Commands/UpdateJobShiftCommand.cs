using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobShifts.Commands
{
    public class UpdateJobShiftCommand : IRequest<bool>
    {
        public int Id { get; set; }
        public int JobPostId { get; set; }
        public int BusinessId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Salary { get; set; }
        public int Slots { get; set; }
        public string UpdatedBy { get; set; }
    }

    public class UpdateJobShiftCommandHandler : IRequestHandler<UpdateJobShiftCommand, bool>
    {
        private readonly IJobDbContext _context;

        public UpdateJobShiftCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateJobShiftCommand request, CancellationToken cancellationToken)
        {
            if (request.EndTime <= request.StartTime)
                throw new Exception("EndTime must be after StartTime.");

            if (request.Salary <= 0 || request.Slots < 1)
                throw new Exception("Salary must be > 0 and Slots must be >= 1.");

            var shift = await _context.JobShifts
                .Include(s => s.JobPost)
                .Include(s => s.Applications)
                .FirstOrDefaultAsync(s => s.Id == request.Id && s.JobPostId == request.JobPostId, cancellationToken);

            if (shift == null || shift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Shift not found or you don't have permission.");

            if (shift.JobPost.Status == "Closed")
                throw new Exception("Cannot update shift for a closed job post.");

            // Check if there are any Approved applications
            var approvedCount = shift.Applications?.Count(a => a.Status == "Approved") ?? 0;
            if (approvedCount > 0)
                throw new Exception("Cannot update a shift that already has approved applications.");

            if (request.Slots < approvedCount)
                throw new Exception("Cannot decrease slots below the number of approved applications.");

            shift.StartTime = request.StartTime;
            shift.EndTime = request.EndTime;
            shift.Salary = request.Salary;
            shift.Slots = request.Slots;
            
            // Adjust remaining slots based on new total slots (if no approved applications, remaining = slots)
            shift.RemainingSlots = request.Slots - approvedCount;

            shift.UpdatedAt = DateTime.UtcNow;
            shift.UpdatedBy = request.UpdatedBy;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
