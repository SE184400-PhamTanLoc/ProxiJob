using MediatR;
using ProxiJob.Identity.Application.DTOs;
using System.Collections.Generic;

namespace ProxiJob.Identity.Application.Features.Students.Queries.GetActiveStudentProfiles
{
    public record GetActiveStudentProfilesQuery : IRequest<List<StudentProfileDto>>;
}
