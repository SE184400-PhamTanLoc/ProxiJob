namespace ProxiJob.Shared.Contract.Identity;

/// <summary>
/// Snapshot user từ Identity (gRPC) — dùng chung giữa Job, Management, ...
/// </summary>
public class IdentityUserContextSnapshot
{
    public int UserId { get; init; }
    public int BusinessId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
    public string? AvatarUrl { get; init; }
    public string Role { get; init; } = string.Empty;
    public string SubscriptionTier { get; init; } = string.Empty;
    public int JobPostLimit { get; init; }
    public int JobPostsUsed { get; init; }
    public string? ProfileStatus { get; init; }
    public double ReputationScore { get; init; }
    public bool IsActive { get; init; }
    public IReadOnlyList<string> Features { get; init; } = Array.Empty<string>();
}
