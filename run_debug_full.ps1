
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading debug_full.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/debug_full.sh"
scp debug_full.sh $Dest

Write-Host "Running debug_full.sh..."
ssh $ServerUser@$ServerIP "bash /root/debug_full.sh"
