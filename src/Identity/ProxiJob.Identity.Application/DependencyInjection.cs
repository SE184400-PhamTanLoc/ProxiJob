using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using ProxiJob.Identity.Application.Common.Behaviors;
using ProxiJob.Identity.Application.Common.Interfaces;
using ProxiJob.Identity.Application.Services;
using System.Reflection;

namespace ProxiJob.Identity.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            services.AddMediatR(cfg =>
            {
                cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
                cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ExceptionHandlingBehavior<,>));
                cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            });

            services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly());
            services.AddScoped<IAuthSessionService, AuthSessionService>();
            services.AddScoped<IJobPostQuotaService, JobPostQuotaService>();
            services.AddScoped<IPaymentService, PaymentService>();

            return services;
        }
    }
}
