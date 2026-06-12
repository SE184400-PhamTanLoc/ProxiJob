using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Application.Common.Interfaces;

public interface IManagementDbContext
{
    DbSet<Employee> Employees { get; }
    DbSet<WorkSchedule> WorkSchedules { get; }
    DbSet<Timekeeping> Timekeepings { get; }
    DbSet<Payroll> Payrolls { get; }
    DbSet<BusinessQrCode> BusinessQrCodes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}

