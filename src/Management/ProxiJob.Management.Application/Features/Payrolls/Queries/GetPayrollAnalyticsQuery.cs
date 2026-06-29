using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Application.Common.Interfaces;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Payrolls.Queries;

public class GetPayrollAnalyticsQuery : IRequest<PayrollAnalyticsDto>
{
    public int BusinessId { get; set; }
    public string Period { get; set; } = "week"; // "day", "week", "month"
}

public class PayrollAnalyticsDto
{
    public decimal TotalDisbursedThisMonth { get; set; }
    public decimal PendingApprovalAmount { get; set; }
    public int ActiveEmployees { get; set; }
    public ChartDataDto ChartData { get; set; } = new();
}

public class ChartDataDto
{
    public List<string> Labels { get; set; } = new();
    public List<DatasetDto> Datasets { get; set; } = new();
}

public class DatasetDto
{
    public List<decimal> Data { get; set; } = new();
}

public class GetPayrollAnalyticsQueryHandler : IRequestHandler<GetPayrollAnalyticsQuery, PayrollAnalyticsDto>
{
    private readonly IManagementDbContext _context;

    public GetPayrollAnalyticsQueryHandler(IManagementDbContext context)
    {
        _context = context;
    }

    public async Task<PayrollAnalyticsDto> Handle(GetPayrollAnalyticsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var currentYear = today.Year;
        var currentMonth = today.Month;

        // 1. Calculate TotalDisbursedThisMonth: SUM(FinalAmount) for Status == Paid in the current calendar month
        var startOfMonth = new DateOnly(currentYear, currentMonth, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var totalDisbursedThisMonth = await _context.Payrolls
            .Where(p => p.Employee.BusinessId == request.BusinessId && 
                        (p.Status == PayrollStatus.Paid || p.Status == PayrollStatus.PendingStudentConfirmation) && 
                        p.PayDate >= startOfMonth && 
                        p.PayDate <= endOfMonth)
            .SumAsync(p => p.FinalAmount, cancellationToken);

        // 2. Calculate PendingApprovalAmount: SUM(FinalAmount) for Status == Pending
        var pendingApprovalAmount = await _context.Payrolls
            .Where(p => p.Employee.BusinessId == request.BusinessId && 
                        p.Status == PayrollStatus.Pending)
            .SumAsync(p => (decimal?)p.FinalAmount, cancellationToken) ?? 0;

        // 3. Calculate ActiveEmployees: Count of active employees for this business
        var activeEmployees = await _context.Employees
            .CountAsync(e => e.BusinessId == request.BusinessId && e.Status == EmployeeStatus.Active, cancellationToken);

        // 4. Calculate Chart Data
        var chartData = new ChartDataDto();
        var dataList = new List<decimal>();

        var periodLower = request.Period?.ToLower() ?? "week";

        if (periodLower == "day")
        {
            // Last 7 days ending today (e.g. 23/06, 24/06, ... Today)
            var labels = new List<string>();
            var startDate = today.AddDays(-6);
            
            var payrolls = await _context.Payrolls
                .Where(p => p.Employee.BusinessId == request.BusinessId && 
                            (p.Status == PayrollStatus.Paid || p.Status == PayrollStatus.PendingStudentConfirmation) && 
                            p.PayDate >= startDate && 
                            p.PayDate <= today)
                .ToListAsync(cancellationToken);

            for (int i = 0; i < 7; i++)
            {
                var targetDate = startDate.AddDays(i);
                labels.Add(targetDate.ToString("dd/MM"));
                var sum = payrolls.Where(p => p.PayDate == targetDate).Sum(p => p.FinalAmount);
                dataList.Add(sum);
            }
            chartData.Labels = labels;
        }
        else if (periodLower == "month")
        {
            // Weeks of the current month (Tuần 1, Tuần 2, Tuần 3, Tuần 4, Tuần 5)
            chartData.Labels = new List<string> { "Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5" };
            
            var payrolls = await _context.Payrolls
                .Where(p => p.Employee.BusinessId == request.BusinessId && 
                            (p.Status == PayrollStatus.Paid || p.Status == PayrollStatus.PendingStudentConfirmation) && 
                            p.PayDate >= startOfMonth && 
                            p.PayDate <= endOfMonth)
                .ToListAsync(cancellationToken);

            for (int w = 1; w <= 5; w++)
            {
                int startDay = (w - 1) * 7 + 1;
                int endDay = w == 5 ? DateTime.DaysInMonth(currentYear, currentMonth) : w * 7;

                if (startDay <= DateTime.DaysInMonth(currentYear, currentMonth))
                {
                    var sum = payrolls
                        .Where(p => p.PayDate.HasValue && 
                                    p.PayDate.Value.Day >= startDay && 
                                    p.PayDate.Value.Day <= endDay)
                        .Sum(p => p.FinalAmount);
                    dataList.Add(sum);
                }
                else
                {
                    dataList.Add(0);
                }
            }
        }
        else // default to "week"
        {
            // Monday to Sunday of the current week (T2, T3, T4, T5, T6, T7, CN)
            chartData.Labels = new List<string> { "T2", "T3", "T4", "T5", "T6", "T7", "CN" };
            
            // Find current week's Monday
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            var monday = today.AddDays(-1 * diff);
            var sunday = monday.AddDays(6);

            var payrolls = await _context.Payrolls
                .Where(p => p.Employee.BusinessId == request.BusinessId && 
                            (p.Status == PayrollStatus.Paid || p.Status == PayrollStatus.PendingStudentConfirmation) && 
                            p.PayDate >= monday && 
                            p.PayDate <= sunday)
                .ToListAsync(cancellationToken);

            for (int i = 0; i < 7; i++)
            {
                var targetDay = (DayOfWeek)(((int)DayOfWeek.Monday + i) % 7);
                var sum = payrolls
                    .Where(p => p.PayDate.HasValue && p.PayDate.Value.DayOfWeek == targetDay)
                    .Sum(p => p.FinalAmount);
                dataList.Add(sum);
            }
        }

        chartData.Datasets.Add(new DatasetDto { Data = dataList });

        return new PayrollAnalyticsDto
        {
            TotalDisbursedThisMonth = totalDisbursedThisMonth,
            PendingApprovalAmount = pendingApprovalAmount,
            ActiveEmployees = activeEmployees,
            ChartData = chartData
        };
    }
}
