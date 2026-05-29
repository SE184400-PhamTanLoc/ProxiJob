using MediatR;
using ProxiJob.Identity.Application.DTOs;
using ProxiJob.Identity.Domain.Enums;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.Register
{
    public record RegisterCommand(
        string FullName,
        string Email,
        string Password,
        string ConfirmPassword,
        UserType UserType
    ) : IRequest<AuthResponseDto>;
}
