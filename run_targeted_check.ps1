
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading targeted_route_check.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/targeted_route_check.sh"
scp targeted_route_check.sh $Dest

Write-Host "Running targeted_route_check.sh..."
ssh $ServerUser@$ServerIP "bash /root/targeted_route_check.sh"
