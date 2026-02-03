
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading Clean Nginx Config..."
$Dest = "$ServerUser@$ServerIP" + ":/etc/nginx/sites-available/default"
scp nginx_default.sh $Dest
# Wait, I named it .conf locally.
scp nginx_default.conf $Dest

Write-Host "Applying Nginx Config..."
$ApplyCmd = "systemctl restart nginx"
ssh $ServerUser@$ServerIP $ApplyCmd
