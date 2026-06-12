using Microsoft.AspNetCore.Mvc;
using ProxiJob.Job.API.Common;

namespace ProxiJob.Job.API.Controllers
{
    [ApiController]
    public class ApiControllerBase : ControllerBase
    {
        protected new IActionResult Ok()
        {
            return base.Ok(ApiResponse.SuccessResponse());
        }

        protected IActionResult Ok<T>(T data, string message = "Request processed successfully")
        {
            return base.Ok(new ApiResponse<T>(true, message, data, null));
        }

        protected IActionResult Created<T>(string uri, T data, string message = "Request processed successfully")
        {
            return base.Created(uri, new ApiResponse<T>(true, message, data, null));
        }

        protected IActionResult CreatedAtAction<T>(string actionName, object routeValues, T data, string message = "Request processed successfully")
        {
            return base.CreatedAtAction(actionName, routeValues, new ApiResponse<T>(true, message, data, null));
        }

        protected IActionResult BadRequest(string message, object errors = null)
        {
            return base.BadRequest(ApiResponse.FailureResponse(message, errors));
        }

        protected new IActionResult BadRequest()
        {
            return base.BadRequest(ApiResponse.FailureResponse("Bad request"));
        }

        protected new IActionResult NotFound()
        {
            return base.NotFound(ApiResponse.FailureResponse("Resource not found"));
        }

        protected IActionResult NotFound(string message)
        {
            return base.NotFound(ApiResponse.FailureResponse(message));
        }
    }
}
