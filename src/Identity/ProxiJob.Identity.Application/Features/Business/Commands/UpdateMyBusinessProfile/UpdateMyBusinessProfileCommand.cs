using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Business.Commands.UpdateMyBusinessProfile
{
    public record UpdateMyBusinessProfileCommand(
        string? PhoneNumber,
        string? AvatarUrl,
        string? BusinessName,
        string? BusinessType,
        string? Address,
        string? City,
        string? TaxCode,
        string? Description
    ) : IRequest<BusinessProfileDto>;
}
