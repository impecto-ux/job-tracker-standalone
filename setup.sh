#!/bin/bash
echo "===== KILLING EVERYTHING ====="
pm2 delete all || true
killall node || true
fuser -k 3000/tcp || true
fuser -k 3001/tcp || true

echo "===== STARTING BACKEND ====="
cd /var/www/job-tracker/service-job-tracker
pm2 start dist/main.js --name job-tracker-api

echo "===== PREPARING FRONTEND WRAPPER (DEV MODE) ====="
cd /var/www/job-tracker/art-engine-v4

# Create wrapper script
echo '#!/bin/bash' > start.sh
echo 'cd /var/www/job-tracker/art-engine-v4' >> start.sh
echo 'exec npm run dev' >> start.sh
chmod +x start.sh

echo "===== STARTING FRONTEND VIA WRAPPER ====="
pm2 start ./start.sh --name art-engine-v4

echo "===== SAVING PM2 ====="
pm2 save

echo "===== WAITING FOR STARTUP ====="
sleep 10

echo "===== LOGS ====="
pm2 logs art-engine-v4 --lines 20 --nostream

echo "===== CURL CHECK ====="
curl -I http://127.0.0.1:3000
