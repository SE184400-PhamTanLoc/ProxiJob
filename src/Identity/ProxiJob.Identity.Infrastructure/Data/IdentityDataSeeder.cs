using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Enums;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Infrastructure.Data
{
    public static class IdentityDataSeeder
    {
        public static async Task SeedAsync(IdentityDbContext context, ILogger logger)
        {
            await SeedRolesAsync(context);
            await SyncSubscriptionPlansAsync(context);
            await SyncSubscriptionFeaturesAsync(context);
            await EnsureStudentProfilesAsync(context);
            logger.LogInformation("Identity seed data applied.");
        }

        private static async Task SeedRolesAsync(IdentityDbContext context)
        {
            var roles = new[]
            {
                new Role { Name = RoleNames.Student, Description = "Sinh viên tìm việc", CreatedBy = "System" },
                new Role { Name = RoleNames.Business, Description = "Chủ quán / doanh nghiệp", CreatedBy = "System" },
                new Role { Name = RoleNames.Admin, Description = "Quản trị hệ thống", CreatedBy = "System" }
            };

            foreach (var role in roles)
            {
                if (!await context.Roles.AnyAsync(r => r.Name == role.Name))
                    await context.Roles.AddAsync(role);
            }

            await context.SaveChangesAsync();
        }

        private static async Task SyncSubscriptionPlansAsync(IdentityDbContext context)
        {
            var plans = new[]
            {
                new Subscription
                {
                    Name = SubscriptionNames.PerShift,
                    Description = "Đăng 1 ca làm việc",
                    Price = 15_000,
                    VariableCost = 5_000,
                    GrossMargin = 10_000,
                    BillingType = BillingType.PerShift,
                    JobPostLimit = 1,
                    DurationDays = 1,
                    HasPriorityDisplay = false,
                    HasHrManagement = false,
                    CreatedBy = "System"
                },
                new Subscription
                {
                    Name = SubscriptionNames.Basic,
                    Description = "Gói tháng cơ bản",
                    Price = 99_000,
                    VariableCost = 30_000,
                    GrossMargin = 69_000,
                    BillingType = BillingType.Monthly,
                    JobPostLimit = 15,
                    DurationDays = 30,
                    HasPriorityDisplay = false,
                    HasHrManagement = false,
                    CreatedBy = "System"
                },
                new Subscription
                {
                    Name = SubscriptionNames.Standard,
                    Description = "Gói tháng không giới hạn đăng tin (Web)",
                    Price = 199_000,
                    VariableCost = 50_000,
                    GrossMargin = 149_000,
                    BillingType = BillingType.Monthly,
                    JobPostLimit = 999,
                    DurationDays = 30,
                    HasPriorityDisplay = false,
                    HasHrManagement = false,
                    CreatedBy = "System"
                },
                new Subscription
                {
                    Name = SubscriptionNames.Premium,
                    Description = "Gói ưu tiên hiển thị + quản lý nhân sự",
                    Price = 299_000,
                    VariableCost = 70_000,
                    GrossMargin = 229_000,
                    BillingType = BillingType.Monthly,
                    JobPostLimit = 999,
                    DurationDays = 30,
                    HasPriorityDisplay = true,
                    HasHrManagement = true,
                    CreatedBy = "System"
                }
            };

            foreach (var plan in plans)
            {
                var existing = await context.Subscriptions.FirstOrDefaultAsync(s => s.Name == plan.Name);
                if (existing == null)
                {
                    await context.Subscriptions.AddAsync(plan);
                    continue;
                }

                existing.Description = plan.Description;
                existing.Price = plan.Price;
                existing.VariableCost = plan.VariableCost;
                existing.GrossMargin = plan.GrossMargin;
                existing.BillingType = plan.BillingType;
                existing.JobPostLimit = plan.JobPostLimit;
                existing.DurationDays = plan.DurationDays;
                existing.HasPriorityDisplay = plan.HasPriorityDisplay;
                existing.HasHrManagement = plan.HasHrManagement;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.UpdatedBy = "System";
            }

            await context.SaveChangesAsync();
        }

        private static async Task SyncSubscriptionFeaturesAsync(IdentityDbContext context)
        {
            var allPlans = await context.Subscriptions
                .Where(s => SubscriptionNames.AllPaidPlans.Contains(s.Name))
                .ToListAsync();

            foreach (var plan in allPlans)
            {
                await EnsureFeatureAsync(context, plan.Id, FeatureCodes.WebPostJob,
                    "Đăng tin tuyển dụng qua Web Dashboard", ClientChannels.Web);

                if (plan.Name == SubscriptionNames.Premium)
                {
                    await EnsureFeatureAsync(context, plan.Id, FeatureCodes.HrManagement,
                        "Công cụ quản lý nhân sự", ClientChannels.Management);
                    await EnsureFeatureAsync(context, plan.Id, FeatureCodes.PriorityListing,
                        "Ưu tiên hiển thị tin tuyển dụng", ClientChannels.Web);
                }
            }

            await context.SaveChangesAsync();
        }

        private static async Task EnsureStudentProfilesAsync(IdentityDbContext context)
        {
            var studentRoleId = await context.Roles
                .Where(r => r.Name == RoleNames.Student)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (studentRoleId == 0)
                return;

            var studentUserIds = await context.UserRoles
                .Where(ur => ur.RoleId == studentRoleId)
                .Select(ur => ur.UserId)
                .ToListAsync();

            foreach (var userId in studentUserIds)
            {
                var exists = await context.StudentProfiles.AnyAsync(p => p.UserId == userId);
                if (exists)
                    continue;

                await context.StudentProfiles.AddAsync(new StudentProfile
                {
                    UserId = userId,
                    ReadinessStatus = ProfileReadinessStatus.Incomplete,
                    CreatedBy = "System"
                });
            }

            await context.SaveChangesAsync();
        }

        private static async Task EnsureFeatureAsync(
            IdentityDbContext context,
            int subscriptionId,
            string code,
            string description,
            string channel)
        {
            var exists = await context.SubscriptionFeatures.AnyAsync(f =>
                f.SubscriptionId == subscriptionId && f.Code == code);
            if (exists)
                return;

            await context.SubscriptionFeatures.AddAsync(new SubscriptionFeature
            {
                SubscriptionId = subscriptionId,
                Code = code,
                Description = description,
                ClientChannel = channel,
                CreatedBy = "System"
            });
        }
    }
}
