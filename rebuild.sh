#!/bin/bash
echo "===== STOPPING SERVICES ====="
pm2 stop all || true
killall node || true

echo "===== CLEANING BUILD ====="
cd /var/www/job-tracker/art-engine-v4
rm -rf .next

echo "===== BUILDING FRONTEND ====="
# Standard build without extra flags to match interactive success
npm run build

echo "===== CHECKING ARTIFACTS ====="
ls -F .next

echo "===== RESTARTING SERVICES ====="
# Start backend
cd /var/www/job-tracker/service-job-tracker
pm2 start dist/main.js --name job-tracker-api

echo "===== STARTING FRONTEND VIA WRAPPER ====="
cd /var/www/job-tracker/art-engine-v4
# Ensure wrapper exists (it should from previous step, but recreate to be safe)
echo '#!/bin/bash' > start.sh
echo 'cd /var/www/job-tracker/art-engine-v4' >> start.sh
echo 'exec npm start' >> start.sh
chmod +x start.sh

pm2 start ./start.sh --name art-engine-v4

echo "===== SAVING PM2 ====="
pm2 save

echo "===== WAITING FOR STARTUP ====="
sleep 15
echo "===== LOGS ====="
pm2 logs art-engine-v4 --lines 20 --nostream
echo "===== CURL CHECK ====="
curl -I http://127.0.0.1:3000
