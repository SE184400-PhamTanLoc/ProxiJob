using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Students.Commands.DeactivateStudentProfile
{
    public record DeactivateStudentProfileCommand : IRequest<CompleteStudentProfileResultDto>;
}
