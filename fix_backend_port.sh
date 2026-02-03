#!/bin/bash
echo "===== PORT 3001 BEFORE ====="
netstat -tulpn | grep 3001 || echo "Nothing on 3001"

echo "===== KILLING PROCESSES ON 3001 ====="
fuser -k 3001/tcp || true
sleep 2

echo "===== PM2 RESET ====="
pm2 delete job-tracker-api || true
pm2 delete art-engine-v4 || true

echo "===== STARTING BACKEND ====="
cd /var/www/job-tracker/service-job-tracker
pm2 start dist/main.js --name job-tracker-api

echo "===== STARTING FRONTEND (DEV MODE) ====="
cd /var/www/job-tracker/art-engine-v4
pm2 start ./start.sh --name art-engine-v4

echo "===== WAITING ===== "
sleep 10

echo "===== PM2 LIST ====="
pm2 list

echo "===== BACKEND LOGS ====="
pm2 logs job-tracker-api --lines 20 --nostream

echo "===== CURL CHECK ====="
curl -s -o /dev/null -w "Status Code: %{http_code}" http://127.0.0.1:3001/users
