# Read Nginx Config
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Reading Nginx Sites..." -ForegroundColor Cyan

$RemoteCmd = 'grep -r "server" /etc/nginx/sites-enabled'

ssh $ServerUser@$ServerIP $RemoteCmd
