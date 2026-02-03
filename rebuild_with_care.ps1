
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "
echo '===== STOPPING SERVICES ====='
pm2 stop all || true
killall node || true
free -h

echo '===== CLEANING BUILD ====='
cd /var/www/job-tracker/art-engine-v4
rm -rf .next

echo '===== BUILDING FRONTEND ====='
# Set low memory limit to trigger GC more often if constrained, or just run hoping for best
export NODE_OPTIONS='--max-old-space-size=2048'
npm run build

echo '===== CHECKING ARTIFACTS ====='
ls -F .next

echo '===== RESTARTING SERVICES ====='
# Start backend
cd /var/www/job-tracker/service-job-tracker
pm2 start dist/main.js --name job-tracker-api

# Start frontend (using wrapper we made, it works if build is good)
cd /var/www/job-tracker/art-engine-v4
pm2 start ./start.sh --name art-engine-v4

echo '===== WAITING ====='
sleep 15
echo '===== LOGS ====='
pm2 logs art-engine-v4 --lines 20 --nostream
echo '===== CURL CHECK ====='
curl -I http://127.0.0.1:3000
"

ssh $ServerUser@$ServerIP $RemoteCmd
