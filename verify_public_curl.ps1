
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "curl -v http://37.148.214.203 --max-time 5"

ssh $ServerUser@$ServerIP $RemoteCmd
