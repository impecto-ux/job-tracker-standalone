
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading install_sqlite_debug.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/install_sqlite_debug.sh"
scp install_sqlite_debug.sh $Dest

Write-Host "Running install_sqlite_debug.sh..."
ssh $ServerUser@$ServerIP "bash /root/install_sqlite_debug.sh"
