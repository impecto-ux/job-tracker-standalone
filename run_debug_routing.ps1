
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading debug_routing.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/debug_routing.sh"
scp debug_routing.sh $Dest

Write-Host "Running debug_routing.sh..."
ssh $ServerUser@$ServerIP "bash /root/debug_routing.sh"
