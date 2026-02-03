
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "pm2 delete all || true && killall node || true && fuser -k 3000/tcp || true && fuser -k 3001/tcp || true && cd /var/www/job-tracker/service-job-tracker && pm2 start dist/main.js --name job-tracker-api && cd ../art-engine-v4 && pm2 start npm --name art-engine-v4 -- start && echo '===== WAITING FOR STARTUP =====' && sleep 5 && echo '===== LOGS =====' && pm2 logs --lines 10 --nostream && echo '===== CURL CHECK =====' && curl -I http://127.0.0.1:3000"

ssh $ServerUser@$ServerIP $RemoteCmd
