# Check Server Logs
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Fetching logs..."
ssh $ServerUser@$ServerIP "pm2 logs backend --lines 50 --nostream"
