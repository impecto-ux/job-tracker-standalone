
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Copying ecosystem config..."
$Dest = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/art-engine-v4/ecosystem.config.js"
scp ecosystem.config.js $Dest

$RemoteCmd = "
echo '===== KILLING EVERYTHING ====='
pm2 delete all || true
killall node || true
fuser -k 3000/tcp || true
fuser -k 3001/tcp || true

echo '===== STARTING BACKEND ====='
cd /var/www/job-tracker/service-job-tracker
pm2 start dist/main.js --name job-tracker-api

echo '===== STARTING FRONTEND ====='
cd /var/www/job-tracker/art-engine-v4
pm2 start ecosystem.config.js

echo '===== SAVING PM2 ====='
pm2 save

echo '===== WAITING FOR STARTUP ====='
sleep 5
echo '===== LOGS ====='
pm2 logs art-engine-v4 --lines 10 --nostream
echo '===== CURL CHECK ====='
curl -I http://127.0.0.1:3000
"

Write-Host "Executing remote commands..."
ssh $ServerUser@$ServerIP $RemoteCmd
