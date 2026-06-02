using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Job.Application.Features.Skills.Commands;
using ProxiJob.Job.Application.Features.Skills.Queries;

namespace ProxiJob.Job.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SkillsController : ApiControllerBase
    {
        private readonly IMediator _mediator;

        public SkillsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _mediator.Send(new GetAllSkillsQuery());
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSkillCommand command)
        {
            command.CreatedBy = User.Identity?.Name ?? "Admin";
            
            try
            {
                var id = await _mediator.Send(command);
                return Created($"/api/skills/{id}", id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateSkillCommand command)
        {
            command.SkillId = id;
            command.UpdatedBy = User.Identity?.Name ?? "Admin";
            
            try
            {
                var success = await _mediator.Send(command);
                if (!success) return NotFound("Skill not found");
                return Ok(true);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var command = new DeleteSkillCommand
            {
                SkillId = id,
                DeletedBy = User.Identity?.Name ?? "Admin"
            };
            
            try
            {
                var success = await _mediator.Send(command);
                if (!success) return NotFound("Skill not found");
                return Ok(true);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
