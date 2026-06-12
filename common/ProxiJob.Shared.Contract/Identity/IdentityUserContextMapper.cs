using ProxiJob.Shared.Contract.Protos;

namespace ProxiJob.Shared.Contract.Identity;

public static class IdentityUserContextMapper
{
    public static IdentityUserContextSnapshot FromGrpc(UserContextGrpcDto grpc)
        => new()
        {
            UserId = grpc.UserId,
            BusinessId = grpc.BusinessId,
            Email = grpc.Email,
            FullName = grpc.FullName,
            PhoneNumber = string.IsNullOrEmpty(grpc.PhoneNumber) ? null : grpc.PhoneNumber,
            AvatarUrl = string.IsNullOrEmpty(grpc.AvatarUrl) ? null : grpc.AvatarUrl,
            Role = grpc.Role,
            SubscriptionTier = grpc.SubscriptionTier,
            JobPostLimit = grpc.JobPostLimit,
            JobPostsUsed = grpc.JobPostsUsed,
            ProfileStatus = string.IsNullOrEmpty(grpc.ProfileStatus) ? null : grpc.ProfileStatus,
            ReputationScore = grpc.ReputationScore,
            IsActive = grpc.IsActive,
            Features = grpc.Features.ToList()
        };
}
