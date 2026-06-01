using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Subscriptions.Queries.GetMyFeatures
{
    public record GetMyFeaturesQuery : IRequest<MyFeaturesDto>;
}
