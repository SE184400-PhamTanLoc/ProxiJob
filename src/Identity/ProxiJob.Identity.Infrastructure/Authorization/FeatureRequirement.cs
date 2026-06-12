using Microsoft.AspNetCore.Authorization;

namespace ProxiJob.Identity.Infrastructure.Authorization
{
    public class FeatureRequirement : IAuthorizationRequirement
    {
        public FeatureRequirement(string featureCode) => FeatureCode = featureCode;
        public string FeatureCode { get; }
    }
}
