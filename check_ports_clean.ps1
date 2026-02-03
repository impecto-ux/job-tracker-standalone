
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "netstat -tulpn | grep LISTEN"

ssh $ServerUser@$ServerIP $RemoteCmd
