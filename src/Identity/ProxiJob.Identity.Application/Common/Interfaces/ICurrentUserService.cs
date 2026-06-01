namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface ICurrentUserService
    {
        int? UserId { get; }
        string? Role { get; }
        string? SubscriptionTier { get; }
    }
}
