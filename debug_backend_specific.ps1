
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "
echo '===== PM2 LIST ====='
pm2 list
echo '===== NETSTAT 3001 ====='
netstat -tulpn | grep 3001
echo '===== BACKEND LOGS ====='
pm2 logs job-tracker-api --lines 50 --nostream
"

ssh $ServerUser@$ServerIP $RemoteCmd
