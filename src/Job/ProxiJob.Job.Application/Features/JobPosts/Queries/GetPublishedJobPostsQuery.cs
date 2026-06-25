using MediatR;
using ProxiJob.Job.Application.Common.Interfaces;
using ProxiJob.Job.Application.Common.Models;
using ProxiJob.Job.Application.Features.JobPosts.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ProxiJob.Job.Application.Features.JobPosts.Queries
{
    public class GetPublishedJobPostsQuery : IRequest<PagedResult<JobPostSummaryDto>>
    {
        public int? CategoryId { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class GetPublishedJobPostsQueryHandler : IRequestHandler<GetPublishedJobPostsQuery, PagedResult<JobPostSummaryDto>>
    {
        private readonly IJobDbContext _context;

        public GetPublishedJobPostsQueryHandler(IJobDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<JobPostSummaryDto>> Handle(GetPublishedJobPostsQuery request, CancellationToken cancellationToken)
        {
            var query = _context.JobPosts
                .Include(j => j.Category)
                .Include(j => j.Location)
                .Include(j => j.Shifts)
                .Where(j => j.Status == "Published");

            if (request.CategoryId.HasValue)
            {
                query = query.Where(j => j.CategoryId == request.CategoryId.Value);
            }

            query = query.OrderByDescending(j => j.CreatedAt);

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query.Skip((request.PageNumber - 1) * request.PageSize)
                                   .Take(request.PageSize)
                                   .Select(j => new JobPostSummaryDto
                                    {
                                        Id = j.Id,
                                        BusinessId = j.BusinessId,
                                        Title = j.Title,
                                        Status = j.Status,
                                        CategoryName = j.Category != null ? j.Category.Name : null,
                                        Address = j.Location != null ? j.Location.Address : null,
                                        Latitude = j.Location != null ? j.Location.Latitude : 0,
                                        Longitude = j.Location != null ? j.Location.Longitude : 0,
                                        Description = j.Description,
                                        Requirements = j.Requirements,
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
