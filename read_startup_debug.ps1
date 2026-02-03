
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "pm2 logs art-engine-v4 --lines 50 --nostream"

ssh $ServerUser@$ServerIP $RemoteCmd
