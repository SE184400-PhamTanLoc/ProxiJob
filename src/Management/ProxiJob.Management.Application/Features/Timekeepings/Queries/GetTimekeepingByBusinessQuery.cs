using System;
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

public class GetTimekeepingByBusinessQuery : IRequest<List<TimekeepingDto>>
{
    public int BusinessId { get; set; }
    public DateOnly Date { get; set; }
}

public class GetTimekeepingByBusinessQueryHandler : IRequestHandler<GetTimekeepingByBusinessQuery, List<TimekeepingDto>>
{
    private readonly IManagementDbContext _context;

    public GetTimekeepingByBusinessQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<List<TimekeepingDto>> Handle(GetTimekeepingByBusinessQuery request, CancellationToken cancellationToken)
    {
        var schedules = await _context.WorkSchedules
            .Include(ws => ws.Employee)
            .Include(ws => ws.Timekeeping)
            .Where(ws => ws.Employee.BusinessId == request.BusinessId && ws.Date == request.Date)
            .OrderBy(ws => ws.Employee.FullName)
            .ToListAsync(cancellationToken);

        var timekeepings = schedules.Select(ws => new TimekeepingDto
        {
            Id = ws.Timekeeping?.Id ?? 0,
            EmployeeId = ws.EmployeeId,
            WorkScheduleId = ws.Id,
            JobShiftId = ws.JobShiftId,
            CheckInTime = ws.Timekeeping?.CheckInTime,
            CheckOutTime = ws.Timekeeping?.CheckOutTime,
            InLatitude = ws.Timekeeping?.InLatitude,
            InLongitude = ws.Timekeeping?.InLongitude,
            OutLatitude = ws.Timekeeping?.OutLatitude,
            OutLongitude = ws.Timekeeping?.OutLongitude,
            CheckInPhoto = ws.Timekeeping?.CheckInPhoto,
            CheckOutPhoto = ws.Timekeeping?.CheckOutPhoto,
            Status = ws.Timekeeping?.Status.ToString() ?? "NotCheckedIn",
            IsManual = ws.Timekeeping?.IsManual ?? false,
            Note = ws.Timekeeping?.Note,
            EmployeeName = ws.Employee.FullName,
            Position = ws.Employee.Position,
            ShiftName = ws.Note
        }).ToList();

        return timekeepings;
    }
}
