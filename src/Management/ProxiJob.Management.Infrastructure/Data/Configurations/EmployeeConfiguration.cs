using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Infrastructure.Data.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("employees");

        builder.Property(e => e.FullName)
            .HasColumnName("full_name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.PhoneNumber)
            .HasColumnName("phone_number")
            .HasMaxLength(20);

        builder.Property(e => e.Position)
            .HasColumnName("position")
            .HasMaxLength(100);

        builder.Property(e => e.Status)
            .HasColumnName("status")
            .HasConversion(
                v => v.ToString(),
                v => Enum.Parse<EmployeeStatus>(v));

        builder.Property(e => e.IsExternal)
            .HasColumnName("is_external");

        builder.Property(e => e.PaymentType)
            .HasColumnName("payment_type")
            .HasConversion(
                v => v.ToString(),
                v => Enum.Parse<PaymentType>(v));

        builder.Property(e => e.HourlyRate)
            .HasColumnName("hourly_rate")
            .HasColumnType("decimal(10,2)");

        builder.Property(e => e.MonthlySalary)
            .HasColumnName("monthly_salary")
            .HasColumnType("decimal(10,2)");

        builder.Property(e => e.BusinessId)
            .HasColumnName("business_id");

        builder.Property(e => e.UserId)
            .HasColumnName("user_id");
    }
}

