
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "pm2 restart art-engine-v4 && echo '===== LOGS =====' && timeout 5s pm2 logs art-engine-v4 --lines 20 --nostream"

ssh $ServerUser@$ServerIP $RemoteCmd
