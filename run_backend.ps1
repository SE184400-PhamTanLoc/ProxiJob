Clear-Host
Write-Host "=========================================" -ForegroundColor Green
Write-Host "         PROXIJOB BACKEND RUNNER" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Chon dich vu ban muon khoi chay:" -ForegroundColor Cyan
Write-Host "1. Identity Service (Cong 5231)"
Write-Host "2. Job Service (Cong 5021)"
Write-Host "3. Management Service (Cong 5057)"
Write-Host "4. Chay ca 3 services (Mo cua so moi)"
Write-Host "5. Thoat"
Write-Host "=========================================" -ForegroundColor Green

$choice = Read-Host "Nhap lua chon cua ban (1-5)"

switch ($choice) {
    "1" {
        Write-Host "Dang khoi chay Identity Service tai cua so nay..." -ForegroundColor Yellow
        dotnet run --project src/Identity/ProxiJob.Identity.API/ProxiJob.Identity.API.csproj
    }
    "2" {
        Write-Host "Dang khoi chay Job Service tai cua so nay..." -ForegroundColor Yellow
        dotnet run --project src/Job/ProxiJob.Job.API/ProxiJob.Job.API.csproj
    }
    "3" {
        Write-Host "Dang khoi chay Management Service tai cua so nay..." -ForegroundColor Yellow
        dotnet run --project src/Management/ProxiJob.Management.API/ProxiJob.Management.API.csproj
    }
    "4" {
        Write-Host "Dang khoi chay ca 3 services trong cac cua so CMD moi..." -ForegroundColor Yellow
        Start-Process cmd -ArgumentList "/k title Identity Service && dotnet run --project src/Identity/ProxiJob.Identity.API/ProxiJob.Identity.API.csproj"
        Start-Process cmd -ArgumentList "/k title Job Service && dotnet run --project src/Job/ProxiJob.Job.API/ProxiJob.Job.API.csproj"
        Start-Process cmd -ArgumentList "/k title Management Service && dotnet run --project src/Management/ProxiJob.Management.API/ProxiJob.Management.API.csproj"
        Write-Host "Da khoi chay ca 3 services." -ForegroundColor Green
    }
    default {
        Write-Host "Tam biet!" -ForegroundColor Green
    }
}
