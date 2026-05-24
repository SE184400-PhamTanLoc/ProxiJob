using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Common.Models;
using ProxiJob.Job.Application.Features.Applications.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.Applications.Queries
{
    public class GetApplicationsByShiftQuery : IRequest<PagedResult<ApplicationDto>>
    {
        public int ShiftId { get; set; }
        public int BusinessId { get; set; }
        public string Status { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class GetApplicationsByShiftQueryHandler : IRequestHandler<GetApplicationsByShiftQuery, PagedResult<ApplicationDto>>
    {
        private readonly IJobDbContext _context;

        public GetApplicationsByShiftQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<ApplicationDto>> Handle(GetApplicationsByShiftQuery request, CancellationToken cancellationToken)
        {
            var shift = await _context.JobShifts
                .Include(s => s.JobPost)
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
            
            if (shift == null || shift.JobPost.BusinessId != request.BusinessId)
                throw new Exception("Shift not found or you don't have permission.");

            var query = _context.Applications
                .Include(a => a.JobShift)
                .ThenInclude(s => s.JobPost)
                .Where(a => a.JobShiftId == request.ShiftId && !a.IsDeleted);

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
