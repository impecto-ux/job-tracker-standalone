
$ServerIP = "37.148.214.203"
$ServerUser = "root"

# Use single line command
$RemoteCmd = "echo '===== PM2 STATUS =====' && pm2 status && echo '===== FRONTEND LOGS =====' && pm2 logs art-engine-v4 --lines 50 --nostream && echo '===== BACKEND LOGS =====' && pm2 logs job-tracker-api --lines 50 --nostream && echo '===== NGINX ERROR LOGS =====' && tail -n 20 /var/log/nginx/error.log"

ssh $ServerUser@$ServerIP $RemoteCmd
