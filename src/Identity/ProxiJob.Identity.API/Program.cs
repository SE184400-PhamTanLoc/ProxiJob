using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using ProxiJob.Identity.API.Filters;
using ProxiJob.Identity.Application;
using ProxiJob.Identity.Infrastructure;
using ProxiJob.Identity.Infrastructure.Data;
using ProxiJob.Identity.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel with two ports:
// - Port 5231: HTTP/1.1 for REST API & Swagger
// - Port 5232: HTTP/2 only for gRPC (Windows requires separate Http2-only port for plain HTTP gRPC)
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(5231, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1;
    });
    serverOptions.ListenAnyIP(5232, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

// --- DbContext ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<IdentityDbContext>(options =>
    options.UseNpgsql(connectionString,
        b => b.MigrationsAssembly("ProxiJob.Identity.Infrastructure")));

// --- Application Layer (MediatR + FluentValidation) ---
builder.Services.AddApplication();

// --- Infrastructure Layer (Repositories + JWT Auth) ---
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddGrpc();

builder.Services.AddControllers(options =>
    options.Filters.Add<ForbiddenAccessExceptionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "ProxiJob Identity API", Version = "v1" });
    // JWT support in Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

await IdentityDatabaseInitializer.InitializeAsync(
    app.Services,
    app.Logger);

app.MapControllers();
app.MapGrpcService<IdentityGrpcServiceImpl>();

Console.WriteLine("\n--> Click to open Swagger: http://localhost:5231/swagger\n");

app.Run();
