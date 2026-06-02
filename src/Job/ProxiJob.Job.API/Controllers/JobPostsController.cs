using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Job.Application.Features.JobPosts.Commands;
using ProxiJob.Job.Application.Features.JobPosts.Queries;

namespace ProxiJob.Job.API.Controllers
{
    [ApiController]
    [Route("api/job-posts")]
    public class JobPostsController : ApiControllerBase
    {
        private readonly IMediator _mediator;

        public JobPostsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateJobPostCommand command)
        {
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = result }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateJobPostCommand command)
        {
            if (id != command.Id) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, [FromBody] DeleteJobPostCommand command)
        {
            if (id != command.Id) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPatch("{id}/publish")]
        public async Task<IActionResult> Publish(int id, [FromBody] PublishJobPostCommand command)
        {
            if (id != command.Id) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPatch("{id}/close")]
        public async Task<IActionResult> Close(int id, [FromBody] CloseJobPostCommand command)
        {
            if (id != command.Id) return BadRequest();
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _mediator.Send(new GetJobPostByIdQuery { Id = id });
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet("business/{businessId}")]
        public async Task<IActionResult> GetByBusiness(int businessId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _mediator.Send(new GetJobPostsByBusinessQuery { BusinessId = businessId, PageNumber = pageNumber, PageSize = pageSize });
            return Ok(result);
        }

        [HttpGet("published")]
        public async Task<IActionResult> GetPublished([FromQuery] int? categoryId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await _mediator.Send(new GetPublishedJobPostsQuery { CategoryId = categoryId, PageNumber = pageNumber, PageSize = pageSize });
            return Ok(result);
        }
    }
}
