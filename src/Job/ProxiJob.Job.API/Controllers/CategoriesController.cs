using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Job.Application.Features.Categories.Commands;
using ProxiJob.Job.Application.Features.Categories.Queries;

namespace ProxiJob.Job.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ApiControllerBase
    {
        private readonly IMediator _mediator;

        public CategoriesController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _mediator.Send(new GetAllCategoriesQuery());
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCategoryCommand command)
        {
            command.CreatedBy = User.Identity?.Name ?? "Admin";
            
            try
            {
                var id = await _mediator.Send(command);
                return Created($"/api/categories/{id}", id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryCommand command)
        {
            command.CategoryId = id;
            command.UpdatedBy = User.Identity?.Name ?? "Admin";
            
            try
            {
                var success = await _mediator.Send(command);
                if (!success) return NotFound("Category not found");
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
            var command = new DeleteCategoryCommand
            {
                CategoryId = id,
                DeletedBy = User.Identity?.Name ?? "Admin"
            };
            
            try
            {
                var success = await _mediator.Send(command);
                if (!success) return NotFound("Category not found");
                return Ok(true);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
