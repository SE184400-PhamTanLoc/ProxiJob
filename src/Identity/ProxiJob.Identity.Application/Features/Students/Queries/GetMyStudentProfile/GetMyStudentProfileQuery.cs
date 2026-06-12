using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Students.Queries.GetMyStudentProfile
{
    public record GetMyStudentProfileQuery : IRequest<StudentProfileDto>;
}
