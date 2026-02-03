
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "
echo '===== PM2 STATUS ====='
pm2 list
echo '===== BACKEND LOGS ====='
pm2 logs job-tracker-api --lines 50 --nostream
echo '===== LISTENING PORTS ====='
netstat -tulpn | grep 3001
echo '===== DOCKER CONTAINERS (DB) ====='
docker ps -a
"

ssh $ServerUser@$ServerIP $RemoteCmd
