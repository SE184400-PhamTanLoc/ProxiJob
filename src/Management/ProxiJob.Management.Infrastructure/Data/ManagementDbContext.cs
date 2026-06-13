using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Domain.Models;
using ProxiJob.Management.Application.Common.Interfaces;

namespace ProxiJob.Management.Infrastructure.Data;

public class ManagementDbContext : DbContext, IManagementDbContext
{
    public ManagementDbContext(DbContextOptions<ManagementDbContext> options)
        : base(options)
    {
    }

    public DbSet<Employee> Employees { get; set; } = null!;
    public DbSet<WorkSchedule> WorkSchedules { get; set; } = null!;
    public DbSet<Timekeeping> Timekeepings { get; set; } = null!;
    public DbSet<Payroll> Payrolls { get; set; } = null!;
    public DbSet<BusinessQrCode> BusinessQrCodes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations first
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ManagementDbContext).Assembly);

        // 1. Cấu hình Naming Convention (Snake Case & Prefix "management_")
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Chuyển đổi tên bảng sang snake_case và thêm tiền tố management_
            var tableName = entity.GetTableName();
            if (!string.IsNullOrEmpty(tableName))
            {
                if (!tableName.StartsWith("management_"))
                {
                    entity.SetTableName("management_" + ToSnakeCase(tableName));
                }
            }

            // Cấu hình tên cột sang snake_case
            foreach (var property in entity.GetProperties())
            {
                var columnName = property.GetColumnName();
                if (!string.IsNullOrEmpty(columnName))
                {
                    property.SetColumnName(ToSnakeCase(columnName));
                }
                else
                {
                    property.SetColumnName(ToSnakeCase(property.Name));
                }
            }
        }

        // Global soft-delete filter
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var isDeletedProp = entityType.FindProperty("IsDeleted");
            if (isDeletedProp != null && isDeletedProp.ClrType == typeof(bool))
            {
                var parameter = System.Linq.Expressions.Expression.Parameter(entityType.ClrType, "e");
                var prop = System.Linq.Expressions.Expression.Property(parameter, "IsDeleted");
                var compare = System.Linq.Expressions.Expression.Equal(
                    prop,
                    System.Linq.Expressions.Expression.Constant(false));
                var lambda = System.Linq.Expressions.Expression.Lambda(compare, parameter);
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }
    }

    private static string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        return System.Text.RegularExpressions.Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
    }
}

