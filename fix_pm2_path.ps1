
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "pm2 delete art-engine-v4 || true && pm2 start npm --name art-engine-v4 --cwd /var/www/job-tracker/art-engine-v4 -- start && echo '===== WAITING =====' && sleep 5 && echo '===== LOGS =====' && pm2 logs art-engine-v4 --lines 20 --nostream && echo '===== CURL CHECK =====' && curl -I http://127.0.0.1:3000"

ssh $ServerUser@$ServerIP $RemoteCmd
