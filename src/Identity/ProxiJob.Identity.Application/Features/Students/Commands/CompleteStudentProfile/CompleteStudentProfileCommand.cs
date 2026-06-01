using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Students.Commands.CompleteStudentProfile
{
    public record CompleteStudentProfileCommand : IRequest<CompleteStudentProfileResultDto>;
}
