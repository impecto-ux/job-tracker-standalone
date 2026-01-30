# Diagnose Server Permissions
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Inspecting server content and permissions..." -ForegroundColor Cyan

$RemoteCmd = 'ls -la /var/www/job-tracker/service-job-tracker'

ssh $ServerUser@$ServerIP $RemoteCmd
