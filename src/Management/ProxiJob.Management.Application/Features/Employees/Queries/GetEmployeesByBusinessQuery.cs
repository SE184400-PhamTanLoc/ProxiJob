using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Common.Models;
using ProxiJob.Management.Application.Features.Employees.DTOs;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Employees.Queries;

public class GetEmployeesByBusinessQuery : IRequest<PagedResult<EmployeeSummaryDto>>
{
    public EmployeeStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class GetEmployeesByBusinessQueryHandler : IRequestHandler<GetEmployeesByBusinessQuery, PagedResult<EmployeeSummaryDto>>
{
    private readonly IManagementDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetEmployeesByBusinessQueryHandler(IManagementDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<EmployeeSummaryDto>> Handle(GetEmployeesByBusinessQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.BusinessId == null)
            throw new InvalidOperationException("BusinessId is required.");

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize < 1 ? 10 : request.PageSize;

        var query = _context.Employees
            .Where(e => e.BusinessId == _currentUser.BusinessId.Value);

        if (request.Status.HasValue)
            query = query.Where(e => e.Status == request.Status.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EmployeeSummaryDto
            {
                Id = e.Id,
                UserId = e.UserId,
                FullName = e.FullName,
                Position = e.Position,
                Status = e.Status,
                IsExternal = e.IsExternal,
                PaymentType = e.PaymentType,
                HourlyRate = e.HourlyRate,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<EmployeeSummaryDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = page,
            PageSize = pageSize
        };
    }
}

