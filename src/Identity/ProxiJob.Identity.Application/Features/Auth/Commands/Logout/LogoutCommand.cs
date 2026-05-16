using MediatR;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Logout
{
    public record LogoutCommand(string RefreshToken) : IRequest<bool>;
}
