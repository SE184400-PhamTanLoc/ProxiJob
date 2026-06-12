using ProxiJob.Shared.Kernel;

namespace ProxiJob.Management.Domain.Models;

public class WorkSchedule : BaseEntity
{
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = default!;

    public int? JobShiftId { get; set; }
    public decimal? JobShiftSalary { get; set; }

    public DateOnly Date { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Note { get; set; }

    public Timekeeping? Timekeeping { get; set; }
}

