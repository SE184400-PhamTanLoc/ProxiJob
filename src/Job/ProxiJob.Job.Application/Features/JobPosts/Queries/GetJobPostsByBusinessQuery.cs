using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Common.Models;
using ProxiJob.Job.Application.Features.JobPosts.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobPosts.Queries
{
    public class GetJobPostsByBusinessQuery : IRequest<PagedResult<JobPostSummaryDto>>
    {
        public int BusinessId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class GetJobPostsByBusinessQueryHandler : IRequestHandler<GetJobPostsByBusinessQuery, PagedResult<JobPostSummaryDto>>
    {
        private readonly IJobDbContext _context;

        public GetJobPostsByBusinessQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<JobPostSummaryDto>> Handle(GetJobPostsByBusinessQuery request, CancellationToken cancellationToken)
        {
            var query = _context.JobPosts
                .Include(j => j.Category)
                .Include(j => j.Location)
                .Include(j => j.Shifts)
                .Where(j => j.BusinessId == request.BusinessId)
                .OrderByDescending(j => j.CreatedAt);

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query.Skip((request.PageNumber - 1) * request.PageSize)
                                   .Take(request.PageSize)
                                   .Select(j => new JobPostSummaryDto
                                   {
                                       Id = j.Id,
                                       Title = j.Title,
                                       Status = j.Status,
                                       CategoryName = j.Category != null ? j.Category.Name : null,
                                       Address = j.Location != null ? j.Location.Address : null,
                                       ShiftCount = j.Shifts.Count,
                                       CreatedAt = j.CreatedAt
                                   })
                                   .ToListAsync(cancellationToken);

            return new PagedResult<JobPostSummaryDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize
            };
        }
    }
}
