using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace ProxiJob.Identity.Application.Common.Behaviors
{
    public class ExceptionHandlingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : notnull
    {
        public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
        {
            try
            {
                return await next();
            }
            catch (InvalidOperationException ex)
            {
                // Bắt lỗi nghiệp vụ (như email đã tồn tại) và chuyển thành ValidationException
                var failures = new List<ValidationFailure>
                {
                    new ValidationFailure("BusinessRule", ex.Message)
                };
                throw new ValidationException(failures);
            }
        }
    }
}
