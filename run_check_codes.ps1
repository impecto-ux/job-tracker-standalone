
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading check_codes.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/check_codes.sh"
scp check_codes.sh $Dest

Write-Host "Running check_codes.sh..."
ssh $ServerUser@$ServerIP "bash /root/check_codes.sh"
