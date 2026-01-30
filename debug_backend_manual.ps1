# Debug Backend
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Manually starting backend for debugging..." -ForegroundColor Yellow

# Stop PM2 backend first
# then run node directly
$RemoteCmd = "pm2 stop backend; cd /var/www/job-tracker/service-job-tracker; node dist/main.js"

ssh $ServerUser@$ServerIP $RemoteCmd
