using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Register
{
    public record RegisterCommand(
        string FullName,
        string Email,
        string Password,
        string ConfirmPassword
    ) : IRequest<AuthResponseDto>;
}
