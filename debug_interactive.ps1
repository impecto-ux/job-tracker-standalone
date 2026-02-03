
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "cd /var/www/job-tracker/art-engine-v4 && echo '===== RUNNING MANUAL START =====' && timeout 5s npm run start || true"

ssh $ServerUser@$ServerIP $RemoteCmd
