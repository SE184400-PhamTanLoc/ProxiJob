using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Features.Students.Commands.CompleteStudentProfile;
using ProxiJob.Identity.Application.Features.Students.Commands.RegisterStudentProfile;
using ProxiJob.Identity.Application.Features.Students.Commands.UpdateMyStudentProfile;
using ProxiJob.Identity.Application.Features.Students.Queries.GetMyStudentProfile;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Domain.Constants;
using ProxiJob.Shared.Contract;

namespace ProxiJob.Identity.API.Controllers
{
    /// <summary>Hồ sơ năng lực sinh viên (E-Portfolio)</summary>
    [ApiController]
    [Route("api/student/profile")]
    [Authorize(Policy = PolicyNames.StudentOnly)]
    public class StudentProfileController : ControllerBase
    {
        private readonly IMediator _mediator;

        public StudentProfileController(IMediator mediator) => _mediator = mediator;

        /// <summary>Đăng ký hồ sơ lần đầu (sau đăng ký tài khoản + đăng nhập)</summary>
        [HttpPost("register")]
        public async Task<IActionResult> RegisterProfile(
            [FromBody] RegisterStudentProfileCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(ApiResponse<object>.Success(
                    new { message = BusinessMessages.ProfileRegistered, profile = result },
                    StatusCodes.Status200OK));
            }
            catch (ValidationException ex)
            {
                return BadRequest(ApiResponse.Fail(StatusCodes.Status400BadRequest, errors: ex.Errors.Select(e => e.ErrorMessage)));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ApiResponse.Fail(StatusCodes.Status409Conflict, ex.Message));
            }
        }

        /// <summary>Xem hồ sơ + tiến độ hoàn thiện</summary>
        [HttpGet]
        public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new GetMyStudentProfileQuery(), cancellationToken);
                return Ok(ApiResponse<object>.Success(result, StatusCodes.Status200OK));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ApiResponse.Fail(StatusCodes.Status404NotFound, ex.Message));
            }
        }

        /// <summary>Sửa hồ sơ (sau khi đã đăng ký)</summary>
        [HttpPut]
        public async Task<IActionResult> UpdateProfile(
            [FromBody] UpdateMyStudentProfileCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(ApiResponse<object>.Success(result, StatusCodes.Status200OK));
            }
            catch (ValidationException ex)
            {
                return BadRequest(ApiResponse.Fail(StatusCodes.Status400BadRequest, errors: ex.Errors.Select(e => e.ErrorMessage)));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse.Fail(StatusCodes.Status400BadRequest, ex.Message));
            }
        }

        /// <summary>Kích hoạt trạng thái Sẵn sàng nhận việc + token mới</summary>
        [HttpPost("activate")]
        public async Task<IActionResult> ActivateProfile(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new CompleteStudentProfileCommand(), cancellationToken);
                return Ok(ApiResponse<object>.Success(result, StatusCodes.Status200OK));
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ApiResponse.Fail(StatusCodes.Status401Unauthorized, ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse.Fail(StatusCodes.Status400BadRequest, ex.Message));
            }
        }
    }
}
