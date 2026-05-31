using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Identity.Application.Common.Messages;
using ProxiJob.Identity.Application.Features.Business.Commands.CompleteBusinessProfile;
using ProxiJob.Identity.Application.Features.Business.Commands.RegisterBusinessProfile;
using ProxiJob.Identity.Application.Features.Business.Commands.UpdateMyBusinessProfile;
using ProxiJob.Identity.Application.Features.Business.Queries.GetMyBusinessProfile;
namespace ProxiJob.Identity.API.Controllers
{
    /// <summary>Hồ sơ doanh nghiệp / chủ quán</summary>
    [ApiController]
    [Route("api/business/profile")]
    [Authorize]
    public class BusinessProfileController : ControllerBase
    {
        private readonly IMediator _mediator;

        public BusinessProfileController(IMediator mediator) => _mediator = mediator;

        [HttpPost("register")]
        public async Task<IActionResult> RegisterProfile(
            [FromBody] RegisterBusinessProfileCommand command,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(command, cancellationToken);
                return Ok(new { message = BusinessMessages.BusinessProfileRegistered, profile = result });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { errors = ex.Errors.Select(e => e.ErrorMessage) });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new GetMyBusinessProfileQuery(), cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile(
            [FromBody] UpdateMyBusinessProfileCommand command,
            CancellationToken cancellationToken)
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("activate")]
        public async Task<IActionResult> ActivateProfile(CancellationToken cancellationToken)
        {
            try
            {
                var result = await _mediator.Send(new CompleteBusinessProfileCommand(), cancellationToken);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
