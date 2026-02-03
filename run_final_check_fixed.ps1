
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading final_check_fixed.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/final_check_fixed.sh"
scp final_check_fixed.sh $Dest

Write-Host "Running final_check_fixed.sh..."
ssh $ServerUser@$ServerIP "bash /root/final_check_fixed.sh"
