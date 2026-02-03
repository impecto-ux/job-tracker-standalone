
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading foolproof_nginx_fix.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/foolproof_nginx_fix.sh"
scp foolproof_nginx_fix.sh $Dest

Write-Host "Running foolproof_nginx_fix.sh..."
ssh $ServerUser@$ServerIP "bash /root/foolproof_nginx_fix.sh"
