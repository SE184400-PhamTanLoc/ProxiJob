using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Business.Commands.RegisterBusinessProfile
{
    public record RegisterBusinessProfileCommand(
        string PhoneNumber,
        string? AvatarUrl,
        string BusinessName,
        string BusinessType,
        string Address,
        string City,
        string? TaxCode,
        string Description
    ) : IRequest<BusinessProfileDto>;
}
