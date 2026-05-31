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
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<SubscriptionFeature> SubscriptionFeatures { get; set; }
        public DbSet<PaymentOrder> PaymentOrders { get; set; }
        public DbSet<StudentProfile> StudentProfiles { get; set; }
        public DbSet<BusinessProfile> BusinessProfiles { get; set; }

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
            modelBuilder.Entity<Subscription>(e =>
            {
                e.Property(x => x.Price).HasColumnType("decimal(18,2)");
                e.Property(x => x.VariableCost).HasColumnType("decimal(18,2)");
                e.Property(x => x.GrossMargin).HasColumnType("decimal(18,2)");
            });

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

            modelBuilder.Entity<UserRole>(e =>
            {
                e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(x => x.UserId).IsUnique();
            });

            modelBuilder.Entity<SubscriptionFeature>(e =>
            {
                e.HasOne(x => x.Subscription).WithMany().HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(x => new { x.SubscriptionId, x.Code }).IsUnique();
            });

            modelBuilder.Entity<PaymentOrder>(e =>
            {
                e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
                e.Property(x => x.Gateway).HasConversion<string>().HasMaxLength(20);
                e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
                e.Property(x => x.ExpiresAt).HasColumnType("timestamp with time zone");
                e.Property(x => x.PaidAt).HasColumnType("timestamp with time zone");
                e.HasIndex(x => x.OrderCode).IsUnique();
                e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne<Subscription>().WithMany().HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<StudentProfile>(e =>
            {
                e.Property(x => x.ReadinessStatus).HasMaxLength(30).IsRequired();
                e.Property(x => x.ReputationScore).HasColumnType("decimal(5,2)");
                e.Property(x => x.DateOfBirth).HasColumnType("timestamp with time zone");
                e.Property(x => x.ReadyForWorkAt).HasColumnType("timestamp with time zone");
                e.Property(x => x.Gender).HasMaxLength(20);
                e.Property(x => x.City).HasMaxLength(100);
                e.Property(x => x.Address).HasMaxLength(300);
                e.Property(x => x.School).HasMaxLength(200);
                e.Property(x => x.Major).HasMaxLength(150);
                e.Property(x => x.Bio).HasMaxLength(2000);
                e.Property(x => x.Skills).HasMaxLength(500);
                e.HasIndex(x => x.UserId).IsUnique();
                e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<BusinessProfile>(e =>
            {
                e.Property(x => x.ReadinessStatus).HasMaxLength(30).IsRequired();
                e.Property(x => x.ReputationScore).HasColumnType("decimal(5,2)");
                e.Property(x => x.ProfileCompleteAt).HasColumnType("timestamp with time zone");
                e.Property(x => x.BusinessName).HasMaxLength(200);
                e.Property(x => x.BusinessType).HasMaxLength(50);
                e.Property(x => x.City).HasMaxLength(100);
                e.Property(x => x.Address).HasMaxLength(300);
                e.Property(x => x.TaxCode).HasMaxLength(20);
                e.Property(x => x.Description).HasMaxLength(2000);
                e.HasIndex(x => x.UserId).IsUnique();
                e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
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
            modelBuilder.Entity<UserRole>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<SubscriptionFeature>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<PaymentOrder>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<StudentProfile>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<BusinessProfile>().HasQueryFilter(x => !x.IsDeleted);
        }
    }
}
