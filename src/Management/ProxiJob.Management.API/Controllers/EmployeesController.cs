using MediatR;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Management.Application.Features.Employees.Commands;
using ProxiJob.Management.Application.Features.Employees.Queries;
using ProxiJob.Management.Domain.Enums;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
[Route("api/employees")]
public class EmployeesController : ControllerBase
{
    private readonly IMediator _mediator;

    public EmployeesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] EmployeeStatus? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetEmployeesByBusinessQuery
        {
            Status = status,
            Page = page,
            PageSize = pageSize
        });
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetEmployeeByIdQuery { EmployeeId = id });
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEmployeeCommand command)
    {
        command.EmployeeId = id;
        var ok = await _mediator.Send(command);
        if (!ok) return NotFound();
        return Ok(true);
    }

    [HttpPatch("{id:int}/terminate")]
    public async Task<IActionResult> Terminate(int id)
    {
        var ok = await _mediator.Send(new TerminateEmployeeCommand { EmployeeId = id });
        if (!ok) return NotFound();
        return Ok(true);
    }

    [HttpPatch("{id:int}/reactivate")]
    public async Task<IActionResult> Reactivate(int id)
    {
        var ok = await _mediator.Send(new ReactivateEmployeeCommand { EmployeeId = id });
        if (!ok) return NotFound();
        return Ok(true);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _mediator.Send(new DeleteEmployeeCommand { EmployeeId = id });
        if (!ok) return NotFound();
        return Ok(true);
    }
}

