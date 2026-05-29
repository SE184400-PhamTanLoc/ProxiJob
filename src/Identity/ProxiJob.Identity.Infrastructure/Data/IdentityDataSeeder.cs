using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Infrastructure.Data
{
    public static class IdentityDataSeeder
    {
        public static async Task SeedAsync(IdentityDbContext context, ILogger logger)
        {
            await SeedRolesAsync(context);
            await SeedSubscriptionsAsync(context);
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

        private static async Task SeedSubscriptionsAsync(IdentityDbContext context)
        {
            if (await context.Subscriptions.AnyAsync())
                return;

            await context.Subscriptions.AddRangeAsync(
                new Subscription
                {
                    Name = SubscriptionNames.Free,
                    Price = 0,
                    JobPostLimit = 3,
                    DurationDays = 365,
                    CreatedBy = "System"
                },
                new Subscription
                {
                    Name = SubscriptionNames.Enterprise,
                    Price = 499_000,
                    JobPostLimit = 999,
                    DurationDays = 30,
                    CreatedBy = "System"
                });

            await context.SaveChangesAsync();
        }
    }
}
