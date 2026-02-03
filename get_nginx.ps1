
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "cat /etc/nginx/sites-enabled/default"

ssh $ServerUser@$ServerIP $RemoteCmd
