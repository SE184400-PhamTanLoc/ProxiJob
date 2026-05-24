using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Common.Models;
using ProxiJob.Job.Application.Features.Applications.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Applications.Queries
{
    public class GetMyApplicationsQuery : IRequest<PagedResult<ApplicationDto>>
    {
        public int StudentId { get; set; }
        public string Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class GetMyApplicationsQueryHandler : IRequestHandler<GetMyApplicationsQuery, PagedResult<ApplicationDto>>
    {
        private readonly IJobDbContext _context;

        public GetMyApplicationsQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<ApplicationDto>> Handle(GetMyApplicationsQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Applications
                .Include(a => a.JobShift)
                .ThenInclude(s => s.JobPost)
                .Where(a => a.StudentId == request.StudentId && !a.IsDeleted);

            if (!string.IsNullOrEmpty(request.Status))
            {
                query = query.Where(a => a.Status == request.Status);
            }

            query = query.OrderByDescending(a => a.CreatedAt);

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query.Skip((request.PageNumber - 1) * request.PageSize)
                                   .Take(request.PageSize)
                                   .Select(a => new ApplicationDto
                                   {
                                       Id = a.Id,
                                       ShiftId = a.JobShiftId,
                                       ShiftStartTime = a.JobShift.StartTime,
                                       ShiftEndTime = a.JobShift.EndTime,
                                       Salary = a.JobShift.Salary,
                                       JobTitle = a.JobShift.JobPost.Title,
                                       Status = a.Status,
                                       CreatedAt = a.CreatedAt
                                   })
                                   .ToListAsync(cancellationToken);

            return new PagedResult<ApplicationDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize
            };
        }
    }
}
