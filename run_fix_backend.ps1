
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading fix_backend_port.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/fix_backend_port.sh"
scp fix_backend_port.sh $Dest

Write-Host "Running fix_backend_port.sh..."
ssh $ServerUser@$ServerIP "bash /root/fix_backend_port.sh"
