namespace ProxiJob.Identity.Domain.Constants
{
    public static class ClaimNames
    {
        public const string SubscriptionTier = "subscription_tier";
        public const string JobPostLimit = "job_post_limit";
        public const string JobPostsUsed = "job_posts_used";
        public const string Features = "features";
        public const string ProfileStatus = "profile_status";
        /// <summary>Giữ tương thích client cũ (sinh viên).</summary>
        public const string ProfileReadiness = "profile_readiness";
        public const string ReputationScore = "reputation_score";
        public const string AvatarUrl = "avatar_url";
    }
}
