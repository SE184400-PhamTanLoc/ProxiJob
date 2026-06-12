using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProxiJob.Management.Domain.Models;

namespace ProxiJob.Management.Infrastructure.Data.Configurations;

public class BusinessQrCodeConfiguration : IEntityTypeConfiguration<BusinessQrCode>
{
    public void Configure(EntityTypeBuilder<BusinessQrCode> builder)
    {
        builder.ToTable("business_qr_codes");

        builder.Property(b => b.BusinessId)
            .HasColumnName("business_id");

        builder.Property(b => b.QrToken)
            .HasColumnName("qr_token")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(b => b.AllowedRadiusMeters)
            .HasColumnName("allowed_radius_meters");

        builder.Property(b => b.IsActive)
            .HasColumnName("is_active");

        builder.Property(b => b.Latitude)
            .HasColumnName("latitude")
            .HasColumnType("double precision");

        builder.Property(b => b.Longitude)
            .HasColumnName("longitude")
            .HasColumnType("double precision");

        builder.HasIndex(b => b.QrToken)
            .IsUnique();

        builder.HasIndex(b => b.BusinessId)
            .IsUnique();
    }
}

