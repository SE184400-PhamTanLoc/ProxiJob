using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.WorkSchedules.DTOs;

namespace ProxiJob.Management.Application.Features.WorkSchedules.Queries;

public class GetSchedulesByEmployeeQuery : IRequest<List<WorkScheduleDto>>
{
    public int EmployeeId { get; set; }
    public int BusinessId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
}

public class GetSchedulesByEmployeeQueryHandler : IRequestHandler<GetSchedulesByEmployeeQuery, List<WorkScheduleDto>>
{
    private readonly IManagementDbContext _context;

    public GetSchedulesByEmployeeQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<List<WorkScheduleDto>> Handle(GetSchedulesByEmployeeQuery request, CancellationToken cancellationToken)
    {
        // Verify employee belongs to the business
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == request.BusinessId, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Employee not found or access denied.");
        }

        var schedules = await _context.WorkSchedules
            .Where(ws => ws.EmployeeId == request.EmployeeId && ws.Date >= request.FromDate && ws.Date <= request.ToDate)
            .OrderBy(ws => ws.StartTime)
            .Select(ws => new WorkScheduleDto
            {
                Id = ws.Id,
                EmployeeId = ws.EmployeeId,
                JobShiftId = ws.JobShiftId,
                JobShiftSalary = ws.JobShiftSalary,
                Date = ws.Date,
                StartTime = ws.StartTime,
                EndTime = ws.EndTime,
                Note = ws.Note
            })
            .ToListAsync(cancellationToken);

        return schedules;
    }
}
