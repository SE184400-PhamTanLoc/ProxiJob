using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobShifts.Commands
{
    public class CreateJobShiftCommand : IRequest<int>
    {
        public int JobPostId { get; set; }
        public int BusinessId { get; set; } // Passed from JWT in controller
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public decimal Salary { get; set; }
        public int Slots { get; set; }
        public string CreatedBy { get; set; }
    }

    public class CreateJobShiftCommandHandler : IRequestHandler<CreateJobShiftCommand, int>
    {
        private readonly IJobDbContext _context;

        public CreateJobShiftCommandHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<int> Handle(CreateJobShiftCommand request, CancellationToken cancellationToken)
        {
            if (request.EndTime <= request.StartTime)
                throw new Exception("EndTime must be after StartTime.");

            if (request.Salary <= 0 || request.Slots < 1)
                throw new Exception("Salary must be > 0 and Slots must be >= 1.");

            var jobPost = await _context.JobPosts
                .FirstOrDefaultAsync(j => j.Id == request.JobPostId && j.BusinessId == request.BusinessId, cancellationToken);

            if (jobPost == null)
                throw new Exception("JobPost not found or you do not have permission.");

            if (jobPost.Status == "Closed")
                throw new Exception("Cannot create a shift for a closed job post.");

            var shift = new JobShift
            {
                JobPostId = request.JobPostId,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                Salary = request.Salary,
                Slots = request.Slots,
                RemainingSlots = request.Slots,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = request.CreatedBy
            };

            _context.JobShifts.Add(shift);
            await _context.SaveChangesAsync(cancellationToken);

            return shift.Id;
        }
    }
}
