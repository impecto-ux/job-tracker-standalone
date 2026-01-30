# Find Frontend Directory
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Locating Frontend Directory..." -ForegroundColor Cyan

$RemoteCmd = 'ls -la /var/www/job-tracker'

ssh $ServerUser@$ServerIP $RemoteCmd
