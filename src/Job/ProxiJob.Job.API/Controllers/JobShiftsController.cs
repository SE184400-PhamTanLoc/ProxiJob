using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Job.Application.Features.JobShifts.Commands;
using ProxiJob.Job.Application.Features.JobShifts.Queries;

namespace ProxiJob.Job.API.Controllers
{
    [ApiController]
    [Route("api/job-posts/{jobPostId}/shifts")]
    public class JobShiftsController : ApiControllerBase
    {
        private readonly IMediator _mediator;

        public JobShiftsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost]
        public async Task<IActionResult> Create(int jobPostId, [FromBody] CreateJobShiftCommand command)
        {
            if (jobPostId != command.JobPostId) return BadRequest("JobPostId mismatch.");
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { jobPostId = jobPostId, shiftId = result }, result);
        }

        [HttpPut("{shiftId}")]
        public async Task<IActionResult> Update(int jobPostId, int shiftId, [FromBody] UpdateJobShiftCommand command)
        {
            if (jobPostId != command.JobPostId || shiftId != command.Id) return BadRequest("Id mismatch.");
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpDelete("{shiftId}")]
        public async Task<IActionResult> Delete(int jobPostId, int shiftId, [FromBody] DeleteJobShiftCommand command)
        {
            if (jobPostId != command.JobPostId || shiftId != command.Id) return BadRequest("Id mismatch.");
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetByJobPost(int jobPostId)
        {
            var result = await _mediator.Send(new GetShiftsByJobPostQuery { JobPostId = jobPostId });
            return Ok(result);
        }

        [HttpGet("{shiftId}")]
        public async Task<IActionResult> GetById(int jobPostId, int shiftId)
        {
            var result = await _mediator.Send(new GetShiftByIdQuery { Id = shiftId });
            if (result == null) return NotFound();
            return Ok(result);
        }
    }
}
