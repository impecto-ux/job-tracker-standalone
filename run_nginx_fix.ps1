
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading fix_nginx_routing.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/fix_nginx_routing.sh"
scp fix_nginx_routing.sh $Dest

Write-Host "Running fix_nginx_routing.sh..."
ssh $ServerUser@$ServerIP "bash /root/fix_nginx_routing.sh"
