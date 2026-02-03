
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading verify_final.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/verify_final.sh"
scp verify_final.sh $Dest

Write-Host "Running verify_final.sh..."
ssh $ServerUser@$ServerIP "bash /root/verify_final.sh"
