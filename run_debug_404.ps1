
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading debug_404.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/debug_404.sh"
scp debug_404.sh $Dest

Write-Host "Running debug_404.sh..."
ssh $ServerUser@$ServerIP "bash /root/debug_404.sh"
