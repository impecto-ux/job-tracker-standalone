
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading check_remote_tables.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/check_remote_tables.sh"
scp check_remote_tables.sh $Dest

Write-Host "Running check_remote_tables.sh..."
ssh $ServerUser@$ServerIP "bash /root/check_remote_tables.sh"
