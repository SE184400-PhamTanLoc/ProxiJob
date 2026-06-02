using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProxiJob.Management.Application.Features.QrCodes.Commands;
using ProxiJob.Management.Application.Features.QrCodes.Queries;

namespace ProxiJob.Management.API.Controllers;

[ApiController]
[Authorize(Roles = "Business")]
public class QrCodesController : ApiControllerBase
{
    private readonly IMediator _mediator;

    public QrCodesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int GetBusinessId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "BusinessId");
        if (claim != null && int.TryParse(claim.Value, out var businessId))
        {
            return businessId;
        }
        return 1; // Default for development
    }

    private string GetCurrentUser()
    {
        return User.Identity?.Name ?? "System";
    }

    [HttpPost("api/qr-code/generate")]
    public async Task<IActionResult> GenerateQrCode()
    {
        var command = new GenerateQrCodeCommand
        {
            BusinessId = GetBusinessId(),
            CreatedBy = GetCurrentUser()
        };
        var token = await _mediator.Send(command);
        return Ok(new { QrToken = token });
    }

    [HttpGet("api/qr-code")]
    public async Task<IActionResult> GetQrCode()
    {
        var query = new GetQrCodeByBusinessQuery
        {
            BusinessId = GetBusinessId()
        };
        var result = await _mediator.Send(query);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPatch("api/qr-code/radius")]
    public async Task<IActionResult> UpdateRadius([FromBody] UpdateQrRadiusCommand command)
    {
        command.BusinessId = GetBusinessId();
        command.UpdatedBy = GetCurrentUser();
        await _mediator.Send(command);
        return Ok();
    }
}
