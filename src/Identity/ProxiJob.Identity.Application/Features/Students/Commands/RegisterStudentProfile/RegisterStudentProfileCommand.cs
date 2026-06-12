using MediatR;
using ProxiJob.Identity.Application.DTOs;

namespace ProxiJob.Identity.Application.Features.Students.Commands.RegisterStudentProfile
{
    /// <summary>Đăng ký hồ sơ năng lực lần đầu (sau khi có tài khoản sinh viên).</summary>
    public record RegisterStudentProfileCommand(
        string PhoneNumber,
        string? AvatarUrl,
        DateTime DateOfBirth,
        string? Gender,
        string Address,
        string City,
        double? Latitude,
        double? Longitude,
        string School,
        string Major,
        int YearOfStudy,
        string Bio,
        string Skills
    ) : IRequest<StudentProfileDto>;
}
