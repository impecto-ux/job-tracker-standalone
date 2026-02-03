
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading Enhanced Nginx Config..."
$Dest = "$ServerUser@$ServerIP" + ":/etc/nginx/sites-available/default"
scp nginx_default_enhanced.conf $Dest

Write-Host "Syncing and Restarting Nginx..."
ssh $ServerUser@$ServerIP "cp /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default && nginx -t && systemctl restart nginx"
