
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "cd /var/www/job-tracker/art-engine-v4 && echo '===== CHECKING .NEXT =====' && ls -F .next || echo '.next MISSING' && echo '===== RUNNING BUILD =====' && npm run build && echo '===== RESTARTING PM2 =====' && pm2 restart art-engine-v4"

ssh $ServerUser@$ServerIP $RemoteCmd
