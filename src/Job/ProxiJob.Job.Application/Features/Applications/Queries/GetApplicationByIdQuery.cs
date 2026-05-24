using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Features.Applications.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Applications.Queries
{
    public class GetApplicationByIdQuery : IRequest<ApplicationDetailDto>
    {
        public int Id { get; set; }
    }

    public class GetApplicationByIdQueryHandler : IRequestHandler<GetApplicationByIdQuery, ApplicationDetailDto>
    {
        private readonly IJobDbContext _context;

        public GetApplicationByIdQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<ApplicationDetailDto> Handle(GetApplicationByIdQuery request, CancellationToken cancellationToken)
        {
            var application = await _context.Applications
                .Include(a => a.JobShift)
                .ThenInclude(s => s.JobPost)
                .Include(a => a.Histories)
                .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

            if (application == null) return null;

            return new ApplicationDetailDto
            {
                Id = application.Id,
                ShiftId = application.JobShiftId,
                ShiftStartTime = application.JobShift.StartTime,
                ShiftEndTime = application.JobShift.EndTime,
                Salary = application.JobShift.Salary,
                JobTitle = application.JobShift.JobPost.Title,
                Status = application.Status,
                CreatedAt = application.CreatedAt,
                Introduction = application.Introduction,
                CVUrl = application.CVUrl,
                Histories = application.Histories.Select(h => new ApplicationHistoryDto
                {
                    Status = h.Status,
                    Note = h.Note,
                    ChangedAt = h.ChangedAt
                }).OrderByDescending(h => h.ChangedAt).ToList()
            };
        }
    }
}
