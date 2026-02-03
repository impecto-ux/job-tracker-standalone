
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "pm2 list && echo '--- CURL LOCALHOST ---' && curl -v http://127.0.0.1:3000 --max-time 2 && echo '--- CURL PUBLIC ---' && curl -v http://37.148.214.203:3000 --max-time 2"

ssh $ServerUser@$ServerIP $RemoteCmd
