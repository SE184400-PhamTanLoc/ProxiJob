using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Features.JobShifts.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobShifts.Queries
{
    public class GetShiftsByJobPostQuery : IRequest<List<JobShiftDto>>
    {
        public int JobPostId { get; set; }
    }

    public class GetShiftsByJobPostQueryHandler : IRequestHandler<GetShiftsByJobPostQuery, List<JobShiftDto>>
    {
        private readonly IJobDbContext _context;

        public GetShiftsByJobPostQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<List<JobShiftDto>> Handle(GetShiftsByJobPostQuery request, CancellationToken cancellationToken)
        {
            return await _context.JobShifts
                .Where(s => s.JobPostId == request.JobPostId)
                .OrderBy(s => s.StartTime)
                .Select(s => new JobShiftDto
                {
                    Id = s.Id,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Salary = s.Salary,
                    Slots = s.Slots,
                    RemainingSlots = s.RemainingSlots
                })
                .ToListAsync(cancellationToken);
        }
    }
}
