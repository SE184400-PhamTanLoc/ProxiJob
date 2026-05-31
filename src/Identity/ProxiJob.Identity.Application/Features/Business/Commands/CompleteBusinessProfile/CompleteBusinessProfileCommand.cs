using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Business.Commands.CompleteBusinessProfile
{
    public record CompleteBusinessProfileCommand() : IRequest<CompleteBusinessProfileResultDto>;
}
