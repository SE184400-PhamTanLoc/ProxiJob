using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using ProxiJob.Identity.Application.Common.Exceptions;

namespace ProxiJob.Identity.API.Filters
{
    public class ForbiddenAccessExceptionFilter : IExceptionFilter
    {
        public void OnException(ExceptionContext context)
        {
            if (context.Exception is not ForbiddenAccessException ex)
                return;

            context.Result = new ObjectResult(new { message = ex.Message })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            context.ExceptionHandled = true;
        }
    }
}
