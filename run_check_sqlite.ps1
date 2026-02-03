
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading check_sqlite.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/check_sqlite.sh"
scp check_sqlite.sh $Dest

Write-Host "Running check_sqlite.sh..."
ssh $ServerUser@$ServerIP "bash /root/check_sqlite.sh"
