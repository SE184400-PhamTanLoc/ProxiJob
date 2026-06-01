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

public class GetSchedulesByBusinessQuery : IRequest<List<WorkScheduleDto>>
{
    public int BusinessId { get; set; }
    public DateOnly Date { get; set; }
}

public class GetSchedulesByBusinessQueryHandler : IRequestHandler<GetSchedulesByBusinessQuery, List<WorkScheduleDto>>
{
    private readonly IManagementDbContext _context;

    public GetSchedulesByBusinessQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<List<WorkScheduleDto>> Handle(GetSchedulesByBusinessQuery request, CancellationToken cancellationToken)
    {
        var schedules = await _context.WorkSchedules
            .Include(ws => ws.Employee)
            .Where(ws => ws.Employee.BusinessId == request.BusinessId && ws.Date == request.Date)
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
