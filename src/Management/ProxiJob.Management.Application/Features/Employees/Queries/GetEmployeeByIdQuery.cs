using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Application.Features.Employees.DTOs;

namespace ProxiJob.Management.Application.Features.Employees.Queries;

public class GetEmployeeByIdQuery : IRequest<EmployeeDetailDto?>
{
    public int EmployeeId { get; set; }
}

public class GetEmployeeByIdQueryHandler : IRequestHandler<GetEmployeeByIdQuery, EmployeeDetailDto?>
{
    private readonly IManagementDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetEmployeeByIdQueryHandler(IManagementDbContext context, ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<EmployeeDetailDto?> Handle(GetEmployeeByIdQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.BusinessId == null)
            throw new InvalidOperationException("BusinessId is required.");

        var employee = await _context.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == _currentUser.BusinessId.Value, cancellationToken);

        if (employee == null) return null;

        var fromDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var upcoming = await _context.WorkSchedules
            .AsNoTracking()
            .Where(ws => ws.EmployeeId == employee.Id && ws.Date >= fromDate)
            .OrderBy(ws => ws.StartTime)
            .Take(10)
            .Select(ws => new UpcomingWorkScheduleDto
            {
                Id = ws.Id,
                Date = ws.Date,
                StartTime = ws.StartTime,
                EndTime = ws.EndTime,
                JobShiftId = ws.JobShiftId
            })
            .ToListAsync(cancellationToken);

        return new EmployeeDetailDto
        {
            Id = employee.Id,
            FullName = employee.FullName,
            Position = employee.Position,
            Status = employee.Status,
            IsExternal = employee.IsExternal,
            PaymentType = employee.PaymentType,
            CreatedAt = employee.CreatedAt,
            PhoneNumber = employee.PhoneNumber,
            UserId = employee.UserId,
            HourlyRate = employee.HourlyRate,
            MonthlySalary = employee.MonthlySalary,
            UpcomingSchedules = upcoming
        };
    }
}

