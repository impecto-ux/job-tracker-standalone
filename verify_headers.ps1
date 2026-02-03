
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "curl -I http://37.148.214.203"

ssh $ServerUser@$ServerIP $RemoteCmd
