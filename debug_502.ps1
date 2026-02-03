
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "echo '===== PM2 LIST =====' && pm2 list && echo '===== NETSTAT (Port 3000) =====' && netstat -tulpn | grep 3000 && echo '===== RESTARTING NGINX =====' && service nginx restart && echo '===== NGINX STATUS =====' && service nginx status | grep Active && echo '===== RECENT ERROR LOGS =====' && tail -n 10 /var/log/nginx/error.log"

ssh $ServerUser@$ServerIP $RemoteCmd
