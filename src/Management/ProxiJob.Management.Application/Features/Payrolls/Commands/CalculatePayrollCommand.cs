using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Application.Features.Payrolls.Commands;

public class CalculatePayrollCommand : IRequest<int>
{
    public int EmployeeId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public int BusinessId { get; set; }
    public string CreatedBy { get; set; } = "System";
}

public class CalculatePayrollCommandHandler : IRequestHandler<CalculatePayrollCommand, int>
{
    private readonly IManagementDbContext _context;

    public CalculatePayrollCommandHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CalculatePayrollCommand request, CancellationToken cancellationToken)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.BusinessId == request.BusinessId, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Employee not found or access denied.");
        }

        var timekeepings = await _context.Timekeepings
            .Include(t => t.WorkSchedule)
            .Where(t => t.EmployeeId == request.EmployeeId &&
                        t.WorkSchedule.Date >= request.FromDate &&
                        t.WorkSchedule.Date <= request.ToDate &&
                        (t.Status == TimekeepingStatus.OnTime || t.Status == TimekeepingStatus.Late) &&
                        t.CheckOutTime.HasValue)
            .ToListAsync(cancellationToken);

        decimal totalHours = 0;
        decimal baseAmount = 0;

        if (employee.PaymentType == PaymentType.PerShift)
        {
            if (employee.IsExternal)
            {
                foreach (var t in timekeepings)
                {
                    var hours = (decimal)(t.CheckOutTime!.Value - t.CheckInTime!.Value).TotalHours;
                    totalHours += hours;
                    var rate = t.WorkSchedule.JobShiftSalary ?? employee.HourlyRate ?? 0;
                    baseAmount += (hours * rate);
                }
            }
            else
            {
                foreach (var t in timekeepings)
                {
                    var hours = (decimal)(t.CheckOutTime!.Value - t.CheckInTime!.Value).TotalHours;
                    totalHours += hours;
                }
                baseAmount = totalHours * (employee.HourlyRate ?? 0);
            }
        }
        else if (employee.PaymentType == PaymentType.Monthly)
        {
            foreach (var t in timekeepings)
            {
                var hours = (decimal)(t.CheckOutTime!.Value - t.CheckInTime!.Value).TotalHours;
                totalHours += hours;
            }
            baseAmount = employee.MonthlySalary ?? 0;
        }

        var payroll = new Payroll
        {
            EmployeeId = employee.Id,
            TotalHours = totalHours,
            BaseAmount = baseAmount,
            FinalAmount = baseAmount,
            Status = PayrollStatus.Pending,
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        _context.Payrolls.Add(payroll);
        await _context.SaveChangesAsync(cancellationToken);

        return payroll.Id;
    }
}
