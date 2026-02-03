
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "echo '===== LOGS =====' && pm2 logs art-engine-v4 --lines 20 --nostream && echo '===== CURL =====' && curl -I http://127.0.0.1:3000"

ssh $ServerUser@$ServerIP $RemoteCmd
