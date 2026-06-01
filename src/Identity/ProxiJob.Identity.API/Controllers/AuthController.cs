using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.Features.Auth.Commands.Login;
using ProxiJob.Identity.Application.Features.Auth.Commands.Logout;
using ProxiJob.Identity.Application.Features.Auth.Commands.RefreshToken;
using ProxiJob.Identity.Application.Features.Auth.Commands.Register;
using ProxiJob.Identity.Domain.Constants;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
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
            catch (ValidationException ex)
            {
                return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
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
                ? Ok(new { message = BusinessMessages.LogoutSuccess })
                : BadRequest(new { message = BusinessMessages.LogoutFailed });
        }
    }
}
