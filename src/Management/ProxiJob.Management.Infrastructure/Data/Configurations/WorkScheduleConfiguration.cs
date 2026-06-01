using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Infrastructure.Data.Configurations;

public class WorkScheduleConfiguration : IEntityTypeConfiguration<WorkSchedule>
{
    public void Configure(EntityTypeBuilder<WorkSchedule> builder)
    {
        builder.ToTable("work_schedules");

        builder.Property(ws => ws.EmployeeId)
            .HasColumnName("employee_id");

        builder.Property(ws => ws.JobShiftId)
            .HasColumnName("job_shift_id");

        builder.Property(ws => ws.JobShiftSalary)
            .HasColumnName("job_shift_salary")
            .HasColumnType("decimal(10,2)");

        builder.Property(ws => ws.Date)
            .HasColumnName("date");

        builder.Property(ws => ws.StartTime)
            .HasColumnName("start_time")
            .HasColumnType("timestamp with time zone");

        builder.Property(ws => ws.EndTime)
            .HasColumnName("end_time")
            .HasColumnType("timestamp with time zone");

        builder.Property(ws => ws.Note)
            .HasColumnName("note");

        builder.HasOne(ws => ws.Employee)
            .WithMany(e => e.WorkSchedules)
            .HasForeignKey(ws => ws.EmployeeId);

        builder.HasOne(ws => ws.Timekeeping)
            .WithOne(t => t.WorkSchedule)
            .HasForeignKey<Timekeeping>(t => t.WorkScheduleId);
    }
}

