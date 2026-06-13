using Microsoft.EntityFrameworkCore;
using ProxiJob.Job.Infrastructure.Data;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

var urls = builder.Configuration["urls"] ?? Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (!string.IsNullOrEmpty(urls))
{
    var bindingUrls = urls.Replace("localhost", "0.0.0.0");
    builder.WebHost.UseUrls(bindingUrls.Split(';'));
}

// Add services to the container.

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<JobDbContext>(options =>
    options.UseNpgsql(connectionString,
        b => b.MigrationsAssembly("ProxiJob.Job.Infrastructure")));

builder.Services.AddScoped<ProxiJob.Job.Application.Common.Interfaces.IJobDbContext>(provider => provider.GetRequiredService<JobDbContext>());
builder.Services.AddSingleton<ProxiJob.Job.Application.Common.Interfaces.IIdentityGrpcClient, ProxiJob.Job.Infrastructure.Services.IdentityGrpcClient>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ProxiJob.Job.Application.Common.Interfaces.ICurrentUserService, ProxiJob.Job.API.Services.CurrentUserService>();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ProxiJob.Job.Application.Features.Categories.Commands.CreateCategoryCommand).Assembly));
// ------------------

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "ProxiJob Job API", Version = "v1" });
});
builder.Services.AddGrpc();

var useRabbitMq = builder.Configuration.GetValue<bool?>("RabbitMQ:Enabled")
    ?? !builder.Environment.IsDevelopment();
builder.Services.AddMassTransit(x =>
{
    if (useRabbitMq)
    {
        x.UsingRabbitMq((context, cfg) =>
        {
            cfg.Host(builder.Configuration.GetValue<string>("RabbitMQ:Host") ?? "localhost", "/", h =>
            {
                h.Username(builder.Configuration.GetValue<string>("RabbitMQ:Username") ?? "guest");
                h.Password(builder.Configuration.GetValue<string>("RabbitMQ:Password") ?? "guest");
            });
        });
    }
    else
    {
        x.UsingInMemory((context, cfg) => cfg.ConfigureEndpoints(context));
    }
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<ProxiJob.Job.API.Middleware.IdentityUserContextMiddleware>();

app.UseAuthorization();

app.MapControllers();
app.MapGrpcService<ProxiJob.Job.Infrastructure.Services.JobGrpcService>();

if (!string.IsNullOrEmpty(urls))
{
    foreach (var url in urls.Split(';'))
    {
        Console.WriteLine($"\n--> Click to open Swagger: {url.Replace("0.0.0.0", "localhost")}/swagger\n");
    }
}

app.Run();
