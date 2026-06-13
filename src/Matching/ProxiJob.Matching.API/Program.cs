var builder = WebApplication.CreateBuilder(args);

var urls = builder.Configuration["urls"] ?? Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (!string.IsNullOrEmpty(urls))
{
    var bindingUrls = urls.Replace("localhost", "0.0.0.0");
    builder.WebHost.UseUrls(bindingUrls.Split(';'));
}

// Add services to the container.

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
