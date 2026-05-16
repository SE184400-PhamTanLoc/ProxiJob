using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.Domain.Models;

namespace ProxiJob.Identity.Infrastructure.Data
{
    public class IdentityDbContext : DbContext
    {
        public IdentityDbContext(DbContextOptions<IdentityDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<UserSubscription> UserSubscriptions { get; set; }
        public DbSet<Wallet> Wallets { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Snake_case naming + prefix "identity_"
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                var tableName = entity.GetTableName();
                if (!string.IsNullOrEmpty(tableName))
                    entity.SetTableName("identity_" + tableName.ToLower());

                foreach (var property in entity.GetProperties())
                    property.SetColumnName(property.Name.ToLower());
            }

            // 2. Decimal types
            modelBuilder.Entity<Wallet>(e => e.Property(x => x.Balance).HasColumnType("decimal(18,2)"));
            modelBuilder.Entity<Transaction>(e => e.Property(x => x.Amount).HasColumnType("decimal(18,2)"));
            modelBuilder.Entity<Subscription>(e => e.Property(x => x.Price).HasColumnType("decimal(18,2)"));

            // 3. Timestamps as UTC
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                entityType.FindProperty("CreatedAt")?.SetColumnType("timestamp with time zone");
                entityType.FindProperty("UpdatedAt")?.SetColumnType("timestamp with time zone");
            }

            // 4. Relationships
            modelBuilder.Entity<Wallet>(e =>
                e.HasOne<User>().WithOne().HasForeignKey<Wallet>(w => w.UserId).OnDelete(DeleteBehavior.Cascade));

            modelBuilder.Entity<Transaction>(e =>
                e.HasOne<Wallet>().WithMany().HasForeignKey(t => t.WalletId).OnDelete(DeleteBehavior.Cascade));

            modelBuilder.Entity<UserSubscription>(e =>
            {
                e.HasOne<User>().WithMany().HasForeignKey(us => us.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne<Subscription>().WithMany().HasForeignKey(us => us.SubscriptionId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<RefreshToken>(e =>
            {
                e.Property(x => x.ExpiryDate).HasColumnType("timestamp with time zone");
                e.HasOne<User>().WithMany().HasForeignKey(rt => rt.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(x => x.Token).IsUnique();
            });

            // 5. Global Query Filters (Soft Delete)
            modelBuilder.Entity<User>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Role>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Permission>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Subscription>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<UserSubscription>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Wallet>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Transaction>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<RefreshToken>().HasQueryFilter(x => !x.IsDeleted);
        }
    }
}
