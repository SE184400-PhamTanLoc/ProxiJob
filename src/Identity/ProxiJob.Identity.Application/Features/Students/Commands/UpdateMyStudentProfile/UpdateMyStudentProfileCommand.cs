using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Students.Commands.UpdateMyStudentProfile
{
    public record UpdateMyStudentProfileCommand(
        string? PhoneNumber,
        string? AvatarUrl,
        DateTime? DateOfBirth,
        string? Gender,
        string? Address,
        string? City,
        string? School,
        string? Major,
        int? YearOfStudy,
        string? Bio,
        string? Skills
    ) : IRequest<StudentProfileDto>;
}
