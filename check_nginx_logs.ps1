# Check Nginx Error Logs
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Fetching Nginx Error Logs..." -ForegroundColor Cyan

$RemoteCmd = 'tail -n 50 /var/log/nginx/error.log'

ssh $ServerUser@$ServerIP $RemoteCmd
