
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "echo '===== PM2 LIST =====' && pm2 list && echo '===== MEMORY =====' && free -h && echo '===== CHECK .NEXT =====' && ls -F /var/www/job-tracker/art-engine-v4/.next"

ssh $ServerUser@$ServerIP $RemoteCmd
