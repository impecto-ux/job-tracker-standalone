
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading debug_data_and_routes.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/debug_data_and_routes.sh"
scp debug_data_and_routes.sh $Dest

Write-Host "Running debug_data_and_routes.sh..."
ssh $ServerUser@$ServerIP "bash /root/debug_data_and_routes.sh"
