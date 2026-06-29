using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProxiJob.Management.Domain.Enums;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Infrastructure.Data.Configurations;

public class PayrollConfiguration : IEntityTypeConfiguration<Payroll>
{
    public void Configure(EntityTypeBuilder<Payroll> builder)
    {
        builder.ToTable("payrolls");

        builder.Property(p => p.EmployeeId)
            .HasColumnName("employee_id");

        builder.Property(p => p.TotalHours)
            .HasColumnName("total_hours")
            .HasColumnType("decimal(10,2)");

        builder.Property(p => p.BaseAmount)
            .HasColumnName("base_amount")
            .HasColumnType("decimal(10,2)");

        builder.Property(p => p.Adjustment)
            .HasColumnName("adjustment")
            .HasColumnType("decimal(10,2)");

        builder.Property(p => p.AdjustmentNote)
            .HasColumnName("adjustment_note");

        builder.Property(p => p.FinalAmount)
            .HasColumnName("final_amount")
            .HasColumnType("decimal(10,2)");

        builder.Property(p => p.PayDate)
            .HasColumnName("pay_date");

        builder.Property(p => p.Status)
            .HasColumnName("status")
            .HasConversion(
                v => v.ToString(),
                v => Enum.Parse<PayrollStatus>(v));

        builder.Property(p => p.Rating)
            .HasColumnName("rating");

        builder.Property(p => p.Comments)
            .HasColumnName("comments");

        builder.Property(p => p.EmployerRating)
            .HasColumnName("employer_rating");

        builder.Property(p => p.EmployerComments)
            .HasColumnName("employer_comments");

        builder.HasOne(p => p.Employee)
            .WithMany(e => e.Payrolls)
            .HasForeignKey(p => p.EmployeeId);
    }
}

