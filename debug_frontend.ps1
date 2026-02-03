
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "echo '===== PM2 LIST =====' && pm2 list && echo '===== APP LOGS =====' && pm2 logs art-engine-v4 --lines 20 --nostream && echo '===== CURL LOCAL APP =====' && curl -s -w ' HTTP_CODE:%{http_code}' http://127.0.0.1:3000 -o /dev/null && echo '' && echo '===== CURL PUBLIC NGINX =====' && curl -s -w ' HTTP_CODE:%{http_code}' http://37.148.214.203 -o /dev/null"

ssh $ServerUser@$ServerIP $RemoteCmd
