namespace ProxiJob.Management.Application.Common.Interfaces;

public interface ICurrentUserService
{
    int? UserId { get; }
    int? BusinessId { get; }
    string UserName { get; }
}

