# Read Default Nginx Config
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Reading Default Nginx Config..." -ForegroundColor Cyan

$RemoteCmd = 'cat /etc/nginx/sites-available/default'

ssh $ServerUser@$ServerIP $RemoteCmd
