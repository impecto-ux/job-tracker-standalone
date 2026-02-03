
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "pm2 stop art-engine-v4 || true && fuser -k 3000/tcp || true && pm2 start art-engine-v4 && echo '===== LOGS =====' && timeout 10s pm2 logs art-engine-v4 --lines 10 --nostream && echo '===== CURL CHECK =====' && curl -I http://127.0.0.1:3000"

ssh $ServerUser@$ServerIP $RemoteCmd
