
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "echo '===== NGINX CONFIG =====' && cat /etc/nginx/sites-enabled/default || cat /etc/nginx/nginx.conf && echo '===== LISTENING PORTS =====' && netstat -tuln || ss -tuln "

ssh $ServerUser@$ServerIP $RemoteCmd
