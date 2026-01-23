# Deploy Script for Job Tracker Backend

$ServerIP = "37.148.214.203"
$ServerUser = "root"
$RemotePath = "/var/www/job-tracker/service-job-tracker"

Write-Host "[Deploy] Starting Deployment to $ServerIP..." -ForegroundColor Cyan

# 1. Local Git Push
Write-Host "1. Pushing local changes to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "Auto-deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

# 2. Remote Update
Write-Host "2. Connecting to Server to Pull & Restart..." -ForegroundColor Yellow

# Using a single line command to avoid Windows CRLF (\r) issues on Linux Bash
$commands = "cd $RemotePath && echo '[Server] Pulling...' && git pull && echo '[Server] Installing...' && npm i && echo '[Server] Building...' && npm run build && echo '[Server] Restarting...' && pm2 restart backend && echo '[Server] Done!'"

ssh $ServerUser@$ServerIP $commands

Write-Host "[Success] All Done! Check valid at http://$ServerIP" -ForegroundColor Green
