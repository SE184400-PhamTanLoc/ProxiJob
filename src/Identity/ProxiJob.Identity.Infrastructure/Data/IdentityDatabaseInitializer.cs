using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ProxiJob.Identity.Infrastructure.Data
{
    public static class IdentityDatabaseInitializer
    {
        public static async Task InitializeAsync(IServiceProvider serviceProvider, ILogger logger)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

            try
            {
                var pending = await context.Database.GetPendingMigrationsAsync();
                if (pending.Any())
                {
                    logger.LogInformation("Applying {Count} pending migration(s): {Migrations}",
                        pending.Count(), string.Join(", ", pending));
                    await context.Database.MigrateAsync();
                }

                await IdentityDataSeeder.SeedAsync(context, logger);
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Database initialization failed. Run: dotnet ef database update --project ..\\ProxiJob.Identity.Infrastructure");
                throw;
            }
        }
    }
}
