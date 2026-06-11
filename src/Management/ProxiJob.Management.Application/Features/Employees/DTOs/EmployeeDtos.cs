using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.Application.Features.Employees.DTOs;

public class EmployeeSummaryDto
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string FullName { get; set; } = default!;
    public string? Position { get; set; }
    public EmployeeStatus Status { get; set; }
    public bool IsExternal { get; set; }
    public PaymentType PaymentType { get; set; }
    public decimal? HourlyRate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class EmployeeDetailDto : EmployeeSummaryDto
{
    public string? PhoneNumber { get; set; }
    public decimal? MonthlySalary { get; set; }
    public List<UpcomingWorkScheduleDto> UpcomingSchedules { get; set; } = new();
}

public class UpcomingWorkScheduleDto
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int? JobShiftId { get; set; }
}

