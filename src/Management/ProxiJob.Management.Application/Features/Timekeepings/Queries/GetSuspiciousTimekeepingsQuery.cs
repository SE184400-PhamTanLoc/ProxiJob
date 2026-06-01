using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Timekeepings.DTOs;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Timekeepings.Queries;

public class GetSuspiciousTimekeepingsQuery : IRequest<List<TimekeepingDto>>
{
    public int BusinessId { get; set; }
}

public class GetSuspiciousTimekeepingsQueryHandler : IRequestHandler<GetSuspiciousTimekeepingsQuery, List<TimekeepingDto>>
{
    private readonly IManagementDbContext _context;

    public GetSuspiciousTimekeepingsQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<List<TimekeepingDto>> Handle(GetSuspiciousTimekeepingsQuery request, CancellationToken cancellationToken)
    {
        var timekeepings = await _context.Timekeepings
            .Include(t => t.WorkSchedule)
            .Include(t => t.Employee)
            .Where(t => t.Employee.BusinessId == request.BusinessId && t.Status == TimekeepingStatus.Suspicious)
            .OrderByDescending(t => t.CheckInTime)
            .Select(t => new TimekeepingDto
            {
                Id = t.Id,
                EmployeeId = t.EmployeeId,
                WorkScheduleId = t.WorkScheduleId,
                CheckInTime = t.CheckInTime,
                CheckOutTime = t.CheckOutTime,
                InLatitude = t.InLatitude,
                InLongitude = t.InLongitude,
                OutLatitude = t.OutLatitude,
                OutLongitude = t.OutLongitude,
                CheckInPhoto = t.CheckInPhoto,
                CheckOutPhoto = t.CheckOutPhoto,
                Status = t.Status.ToString(),
                IsManual = t.IsManual,
                Note = t.Note
            })
            .ToListAsync(cancellationToken);

        return timekeepings;
    }
}
