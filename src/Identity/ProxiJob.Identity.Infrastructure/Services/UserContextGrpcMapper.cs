using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Shared.Contract.Protos;

namespace ProxiJob.Identity.Infrastructure.Services
{
    public static class UserContextGrpcMapper
    {
        public static UserContextGrpcDto ToGrpc(UserContextDto dto)
        {
            var message = new UserContextGrpcDto
            {
                UserId = dto.UserId,
                BusinessId = dto.BusinessId,
                Email = dto.Email ?? string.Empty,
                FullName = dto.FullName ?? string.Empty,
                PhoneNumber = dto.PhoneNumber ?? string.Empty,
                AvatarUrl = dto.AvatarUrl ?? string.Empty,
                Role = dto.Role ?? string.Empty,
                SubscriptionTier = dto.SubscriptionTier ?? string.Empty,
                JobPostLimit = dto.JobPostLimit,
                JobPostsUsed = dto.JobPostsUsed,
                ProfileStatus = dto.ProfileStatus ?? string.Empty,
                ReputationScore = (double)dto.ReputationScore,
                IsActive = dto.IsActive
            };
            message.Features.AddRange(dto.Features);
            return message;
        }
    }
}
