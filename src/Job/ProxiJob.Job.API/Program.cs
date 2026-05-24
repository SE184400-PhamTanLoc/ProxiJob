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
builder.Services.AddScoped<ProxiJob.Job.Application.Common.Interfaces.IIdentityServiceGrpcClient, ProxiJob.Job.Infrastructure.Services.IdentityServiceGrpcClient>();
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ProxiJob.Job.Application.Features.Categories.Commands.CreateCategoryCommand).Assembly));
// ------------------

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddGrpc();

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(builder.Configuration.GetValue<string>("RabbitMQ:Host") ?? "localhost", "/", h =>
        {
            h.Username(builder.Configuration.GetValue<string>("RabbitMQ:Username") ?? "guest");
            h.Password(builder.Configuration.GetValue<string>("RabbitMQ:Password") ?? "guest");
        });
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
app.MapGrpcService<ProxiJob.Job.Infrastructure.Services.JobGrpcService>();

app.Run();
