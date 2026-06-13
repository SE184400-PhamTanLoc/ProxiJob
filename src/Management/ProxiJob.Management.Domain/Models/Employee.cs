using ProxiJob.Management.Domain.Enums;
using ProxiJob.Shared.Kernel;

namespace ProxiJob.Management.Domain.Models;

public class Employee : BaseEntity
{
    public int BusinessId { get; set; }
    public int? UserId { get; set; }

    public string FullName { get; set; } = default!;
    public string? PhoneNumber { get; set; }
    public string? Position { get; set; }

    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    public bool IsExternal { get; set; } = false;

    public PaymentType PaymentType { get; set; }
    public decimal? HourlyRate { get; set; }
    public decimal? MonthlySalary { get; set; }

    public ICollection<WorkSchedule> WorkSchedules { get; set; } = new List<WorkSchedule>();
    public ICollection<Timekeeping> Timekeepings { get; set; } = new List<Timekeeping>();
    public ICollection<Payroll> Payrolls { get; set; } = new List<Payroll>();
}

