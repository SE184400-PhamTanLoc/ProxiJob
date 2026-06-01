using System.Security.Claims;

namespace ProxiJob.Identity.Application.Common.Interfaces
{
    public interface IAccessTokenValidator
    {
        ClaimsPrincipal? Validate(string accessToken);
    }
}
