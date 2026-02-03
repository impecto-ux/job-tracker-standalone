
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading setup.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/setup.sh"
scp setup.sh $Dest

Write-Host "Running setup.sh..."
ssh $ServerUser@$ServerIP "bash /root/setup.sh"
