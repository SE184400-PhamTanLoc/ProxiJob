using Microsoft.EntityFrameworkCore;
using ProxiJob.Job.Infrastructure.Data;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();
}
else
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<ProxiJob.Job.API.Middleware.IdentityUserContextMiddleware>();

app.UseAuthorization();

app.MapControllers();
app.MapGrpcService<ProxiJob.Job.Infrastructure.Services.JobGrpcService>();

app.Run();
