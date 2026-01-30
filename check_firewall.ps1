# Check Firewall Status
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Checking Firewall Rules..." -ForegroundColor Cyan

$RemoteCmd = 'ufw status verbose'

ssh $ServerUser@$ServerIP $RemoteCmd
