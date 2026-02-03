
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading check_backend.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/check_backend.sh"
scp check_backend.sh $Dest

Write-Host "Running check_backend.sh..."
ssh $ServerUser@$ServerIP "bash /root/check_backend.sh"
