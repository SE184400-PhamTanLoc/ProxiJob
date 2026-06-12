using System;

namespace ProxiJob.Management.Application.Features.WorkSchedules.DTOs;

public class WorkScheduleDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int? JobShiftId { get; set; }
    public decimal? JobShiftSalary { get; set; }
    public DateOnly Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Note { get; set; }
}
