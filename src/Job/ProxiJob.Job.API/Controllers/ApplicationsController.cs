using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Job.Application.Features.Applications.Commands;
using ProxiJob.Job.Application.Features.Applications.Queries;

namespace ProxiJob.Job.API.Controllers
{
    [ApiController]
    public class ApplicationsController : ApiControllerBase
    {
        private readonly IMediator _mediator;

        public ApplicationsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost("api/shifts/{shiftId}/apply")]
        public async Task<IActionResult> Apply(int shiftId, [FromBody] ApplyShiftCommand command)
        {
            if (shiftId != command.ShiftId) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpDelete("api/applications/{id}/withdraw")]
        public async Task<IActionResult> Withdraw(int id, [FromBody] WithdrawApplicationCommand command)
        {
            if (id != command.Id) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("api/applications/my")]
        public async Task<IActionResult> GetMyApplications([FromQuery] int studentId, [FromQuery] string? status, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _mediator.Send(new GetMyApplicationsQuery { StudentId = studentId, Status = status, PageNumber = pageNumber, PageSize = pageSize });
            return Ok(result);
        }

        [HttpGet("api/shifts/{shiftId}/applications")]
        public async Task<IActionResult> GetByShift(int shiftId, [FromQuery] int businessId, [FromQuery] string? status, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _mediator.Send(new GetApplicationsByShiftQuery { ShiftId = shiftId, BusinessId = businessId, Status = status, PageNumber = pageNumber, PageSize = pageSize });
            return Ok(result);
        }

        [HttpGet("api/applications/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _mediator.Send(new GetApplicationByIdQuery { Id = id });
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPatch("api/applications/{id}/approve")]
        public async Task<IActionResult> Approve(int id, [FromBody] ApproveApplicationCommand command)
        {
            if (id != command.ApplicationId) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPatch("api/applications/{id}/reject")]
        public async Task<IActionResult> Reject(int id, [FromBody] RejectApplicationCommand command)
        {
            if (id != command.ApplicationId) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPatch("api/applications/{id}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelApplicationCommand command)
        {
            if (id != command.ApplicationId) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }
    }
}
