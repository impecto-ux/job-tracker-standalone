
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading final_verify_full.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/final_verify_full.sh"
scp final_verify_full.sh $Dest

Write-Host "Running final_verify_full.sh..."
ssh $ServerUser@$ServerIP "bash /root/final_verify_full.sh"
