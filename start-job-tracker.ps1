# Job Tracker Standalone Startup Script

Write-Host "🚀 Launching Job Tracker Standalone Ecosystem..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "📡 Starting Backend (Service Job Tracker)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\genco\.gemini\antigravity\scratch\service-job-tracker'; npm run start:dev" -WindowStyle Normal

# 2. Wait for Backend
Start-Sleep -Seconds 5

# 3. Start Frontend
Write-Host "🎨 Starting Standalone Frontend (Port 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\genco\.gemini\antigravity\scratch\art-engine-v7-standalone'; npm run dev -- -p 3002" -WindowStyle Normal

Write-Host "✨ All systems active!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3002"
Write-Host "Backend:  http://localhost:3001"
