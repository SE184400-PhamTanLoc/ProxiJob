using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken
{
    public record RefreshTokenCommand(
        string RefreshToken
    ) : IRequest<AuthTokensDto>;
}
