using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Business.Queries.GetMyBusinessProfile
{
    public record GetMyBusinessProfileQuery() : IRequest<BusinessProfileDto>;
}
