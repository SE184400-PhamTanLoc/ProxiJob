using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Features.JobShifts.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobShifts.Queries
{
    public class GetShiftByIdQuery : IRequest<JobShiftDto>
    {
        public int Id { get; set; }
    }

    public class GetShiftByIdQueryHandler : IRequestHandler<GetShiftByIdQuery, JobShiftDto>
    {
        private readonly IJobDbContext _context;

        public GetShiftByIdQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<JobShiftDto> Handle(GetShiftByIdQuery request, CancellationToken cancellationToken)
        {
            var shift = await _context.JobShifts
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);

            if (shift == null) return null;

            return new JobShiftDto
            {
                Id = shift.Id,
                StartTime = shift.StartTime,
                EndTime = shift.EndTime,
                Salary = shift.Salary,
                Slots = shift.Slots,
                RemainingSlots = shift.RemainingSlots
            };
        }
    }
}
