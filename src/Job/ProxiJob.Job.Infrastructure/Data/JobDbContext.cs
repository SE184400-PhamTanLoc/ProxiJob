using Microsoft.EntityFrameworkCore;
using ProxiJob.Job.Domain.Models;

using ProxiJob.Job.Application.Common.Interfaces;

namespace ProxiJob.Job.Infrastructure.Data
{
    public class JobDbContext : DbContext, IJobDbContext
    {
        public JobDbContext(DbContextOptions<JobDbContext> options) : base(options) { }

        // --- Đăng ký các DbSet ---
        public DbSet<JobPost> JobPosts { get; set; }
        public DbSet<JobLocation> JobLocations { get; set; }
        public DbSet<JobShift> JobShifts { get; set; }
        public DbSet<Skill> Skills { get; set; }
        public DbSet<Domain.Models.Application> Applications { get; set; }
        public DbSet<ApplicationHistory> ApplicationHistories { get; set; }
        public DbSet<JobCategory> JobCategories { get; set; }
        public DbSet<JobPostSkill> JobPostSkills { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Cấu hình Naming Convention (Snake Case & Prefix "job_")
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                // Chuyển đổi tên bảng sang snake_case và thêm tiền tố job_
                var tableName = entity.GetTableName();
                if (!string.IsNullOrEmpty(tableName))
                {
                    entity.SetTableName("job_" + tableName.ToLower());
                }

                // Cấu hình tên cột sang snake_case
                foreach (var property in entity.GetProperties())
                {
                    property.SetColumnName(property.Name.ToLower());
                }
            }

            // 2. Cấu hình kiểu dữ liệu đặc thù cho PostgreSQL
            modelBuilder.Entity<JobShift>(entity =>
            {
                entity.Property(e => e.Salary).HasColumnType("decimal(18,2)");
                // Đảm bảo DateTime được lưu ở dạng UTC để tránh lỗi múi giờ trên Cloud
                entity.Property(e => e.StartTime).HasColumnType("timestamp with time zone");
                entity.Property(e => e.EndTime).HasColumnType("timestamp with time zone");
            });

            modelBuilder.Entity<JobLocation>(entity =>
            {
                // Kiểu dữ liệu chính xác cho tọa độ GPS
                entity.Property(e => e.Latitude).HasColumnType("double precision");
                entity.Property(e => e.Longitude).HasColumnType("double precision");
            });

            // 3. Cấu hình các mối quan hệ (Fluent API)
            modelBuilder.Entity<JobPost>(entity =>
            {
                entity.HasMany(e => e.Shifts)
                      .WithOne(s => s.JobPost)
                      .HasForeignKey(s => s.JobPostId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Location)
                      .WithOne(l => l.JobPost)
                      .HasForeignKey<JobLocation>(l => l.JobPostId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<JobShift>(entity =>
            {
                entity.HasMany(e => e.Applications)
                      .WithOne(a => a.JobShift)
                      .HasForeignKey(a => a.JobShiftId)
                      .OnDelete(DeleteBehavior.Restrict); // Hạn chế xóa ca nếu đã có đơn ứng tuyển
            });

            modelBuilder.Entity<Domain.Models.Application>(entity =>
            {
                entity.HasMany(e => e.Histories)
                      .WithOne(h => h.Application)
                      .HasForeignKey(h => h.ApplicationId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<JobPostSkill>(entity =>
            {
                entity.HasOne(e => e.JobPost)
                      .WithMany(j => j.JobPostSkills)
                      .HasForeignKey(e => e.JobPostId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Skill)
                      .WithMany(s => s.JobPostSkills)
                      .HasForeignKey(e => e.SkillId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<JobCategory>(entity =>
            {
                entity.HasMany(e => e.JobPosts)
                      .WithOne(j => j.Category)
                      .HasForeignKey(j => j.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // 4. Global Query Filter (Soft Delete)
            modelBuilder.Entity<JobPost>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<JobShift>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Domain.Models.Application>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<JobLocation>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<ApplicationHistory>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Skill>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<JobCategory>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<JobPostSkill>().HasQueryFilter(x => !x.IsDeleted);
        }
    }
}
