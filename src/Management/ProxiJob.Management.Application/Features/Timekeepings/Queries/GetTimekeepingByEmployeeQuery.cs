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

public class GetTimekeepingByEmployeeQuery : IRequest<List<TimekeepingDto>>
{
    public int EmployeeId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public int BusinessId { get; set; }
}

public class GetTimekeepingByEmployeeQueryHandler : IRequestHandler<GetTimekeepingByEmployeeQuery, List<TimekeepingDto>>
{
    private readonly IManagementDbContext _context;

    public GetTimekeepingByEmployeeQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<List<TimekeepingDto>> Handle(GetTimekeepingByEmployeeQuery request, CancellationToken cancellationToken)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == request.BusinessId, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Employee not found or access denied.");
        }

        var timekeepings = await _context.Timekeepings
            .Include(t => t.WorkSchedule)
            .Include(t => t.Employee)
            .Where(t => t.EmployeeId == request.EmployeeId && 
                        t.WorkSchedule.Date >= request.FromDate && 
                        t.WorkSchedule.Date <= request.ToDate)
            .OrderByDescending(t => t.WorkSchedule.Date)
            .Select(t => new TimekeepingDto
            {
                Id = t.Id,
                EmployeeId = t.EmployeeId,
                WorkScheduleId = t.WorkScheduleId,
                JobShiftId = t.WorkSchedule.JobShiftId,
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
                Note = t.Note,
                EmployeeName = t.Employee.FullName,
                Position = t.Employee.Position,
                ShiftName = t.WorkSchedule.Note
            })
            .ToListAsync(cancellationToken);

        return timekeepings;
    }
}
