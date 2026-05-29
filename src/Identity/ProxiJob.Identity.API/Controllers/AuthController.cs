using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Features.Auth.Commands.Login;
using ProxiJob.Identity.Application.Features.Auth.Commands.Logout;
using ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken;
using ProxiJob.Identity.Application.Features.Auth.Commands.Register;

namespace ProxiJob.Identity.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;

        public AuthController(IMediator mediator) => _mediator = mediator;

        /// <summary>Đăng ký — UserType: 0 = Student, 1 = Business</summary>
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterCommand command, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
            }
        }

        /// <summary>Đăng nhập</summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginCommand command, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>Làm mới AccessToken bằng RefreshToken</summary>
        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenCommand command, CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>Đăng xuất — revoke RefreshToken</summary>
        [HttpPost("logout")]
        [AllowAnonymous]
        public async Task<IActionResult> Logout([FromBody] LogoutCommand command, CancellationToken cancellationToken)
        {
            var result = await _mediator.Send(command, cancellationToken);
            return result
                ? Ok(new { message = "Logged out successfully." })
                : BadRequest(new { message = "Invalid or already revoked token." });
        }

        /// <summary>Thông tin tài khoản đang đăng nhập</summary>
        [HttpGet("me")]
        [Authorize]
        public IActionResult Me()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                ?? User.FindFirst("email")?.Value;
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var tier = User.FindFirst(ProxiJob.Identity.Domain.Constants.ClaimNames.SubscriptionTier)?.Value;
            var jobPostLimit = User.FindFirst(ProxiJob.Identity.Domain.Constants.ClaimNames.JobPostLimit)?.Value;

            return Ok(new
            {
                userId,
                email,
                role,
                subscriptionTier = tier,
                jobPostLimit
            });
        }
    }
}
