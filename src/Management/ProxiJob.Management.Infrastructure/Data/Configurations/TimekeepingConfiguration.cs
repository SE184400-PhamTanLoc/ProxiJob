using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Infrastructure.Data.Configurations;

public class TimekeepingConfiguration : IEntityTypeConfiguration<Timekeeping>
{
    public void Configure(EntityTypeBuilder<Timekeeping> builder)
    {
        builder.ToTable("timekeepings");

        builder.Property(t => t.EmployeeId)
            .HasColumnName("employee_id");

        builder.Property(t => t.WorkScheduleId)
            .HasColumnName("work_schedule_id");

        builder.Property(t => t.CheckInTime)
            .HasColumnName("check_in_time")
            .HasColumnType("timestamp with time zone");

        builder.Property(t => t.CheckOutTime)
            .HasColumnName("check_out_time")
            .HasColumnType("timestamp with time zone");

        builder.Property(t => t.InLatitude)
            .HasColumnName("in_latitude")
            .HasColumnType("double precision");

        builder.Property(t => t.InLongitude)
            .HasColumnName("in_longitude")
            .HasColumnType("double precision");

        builder.Property(t => t.OutLatitude)
            .HasColumnName("out_latitude")
            .HasColumnType("double precision");

        builder.Property(t => t.OutLongitude)
            .HasColumnName("out_longitude")
            .HasColumnType("double precision");

        builder.Property(t => t.CheckInPhoto)
            .HasColumnName("check_in_photo");

        builder.Property(t => t.CheckOutPhoto)
            .HasColumnName("check_out_photo");

        builder.Property(t => t.Status)
            .HasColumnName("status")
            .HasConversion(
                v => v.ToString(),
                v => Enum.Parse<TimekeepingStatus>(v));

        builder.Property(t => t.IsManual)
            .HasColumnName("is_manual");

        builder.Property(t => t.Note)
            .HasColumnName("note");

        builder.HasOne(t => t.Employee)
            .WithMany(e => e.Timekeepings)
            .HasForeignKey(t => t.EmployeeId);
    }
}

