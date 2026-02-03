
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading get_full_logs.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/get_full_logs.sh"
scp get_full_logs.sh $Dest

Write-Host "Running get_full_logs.sh..."
ssh $ServerUser@$ServerIP "bash /root/get_full_logs.sh"
