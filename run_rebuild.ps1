
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading rebuild_backend.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/rebuild_backend.sh"
scp rebuild_backend.sh $Dest

Write-Host "Running rebuild_backend.sh..."
ssh $ServerUser@$ServerIP "bash /root/rebuild_backend.sh"
