using Microsoft.EntityFrameworkCore;
using ProxiJob.Management.Infrastructure.Data;
using MassTransit;
using ProxiJob.Management.Infrastructure.BackgroundJobs;

var builder = WebApplication.CreateBuilder(args);

var urls = builder.Configuration["urls"] ?? Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (!string.IsNullOrEmpty(urls))
{
    var bindingUrls = urls.Replace("localhost", "0.0.0.0");
    builder.WebHost.UseUrls(bindingUrls.Split(';'));
}

// Add services to the container.

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<ManagementDbContext>(options =>
    options.UseNpgsql(connectionString,
        b => b.MigrationsAssembly("ProxiJob.Management.Infrastructure")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ProxiJob.Management.Application.Common.Interfaces.IIdentityGrpcClient, ProxiJob.Management.Infrastructure.Services.IdentityGrpcClient>();
builder.Services.AddScoped<ProxiJob.Management.Application.Common.Interfaces.ICurrentUserService, ProxiJob.Management.API.Services.CurrentUserService>();
builder.Services.AddScoped<ProxiJob.Management.Application.Common.Interfaces.IManagementDbContext>(provider => provider.GetRequiredService<ManagementDbContext>());
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ProxiJob.Management.Application.Features.Employees.Commands.CreateEmployeeCommand).Assembly));

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ProxiJob.Management.Infrastructure.Messaging.Consumers.ApplicationApprovedConsumer>();
    x.AddConsumer<ProxiJob.Management.Infrastructure.Messaging.Consumers.ApplicationCancelledConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration.GetValue<string>("RabbitMQ:Host") ?? "localhost", "/", h =>
        {
            h.Username(builder.Configuration.GetValue<string>("RabbitMQ:Username") ?? "guest");
            h.Password(builder.Configuration.GetValue<string>("RabbitMQ:Password") ?? "guest");
        });

        cfg.ReceiveEndpoint("management.application.approved", e =>
        {
            e.ConfigureConsumer<ProxiJob.Management.Infrastructure.Messaging.Consumers.ApplicationApprovedConsumer>(context);
        });

        cfg.ReceiveEndpoint("management.application.cancelled", e =>
        {
            e.ConfigureConsumer<ProxiJob.Management.Infrastructure.Messaging.Consumers.ApplicationCancelledConsumer>(context);
        });
    });
});

builder.Services.AddHostedService<AutoAbsentJob>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<ProxiJob.Management.API.Middleware.IdentityUserContextMiddleware>();

app.UseAuthorization();

app.MapControllers();

if (!string.IsNullOrEmpty(urls))
{
    foreach (var url in urls.Split(';'))
    {
        Console.WriteLine($"\n--> Click to open Swagger: {url.Replace("0.0.0.0", "localhost")}/swagger\n");
    }
}

app.Run();
