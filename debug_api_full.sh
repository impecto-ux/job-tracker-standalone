#!/bin/bash
echo "===== PM2 STATUS DETAILED ====="
pm2 list
pm2 show job-tracker-api

echo "===== PORT CHECK ====="
netstat -tulpn | grep 3001

echo "===== INTERNAL API TESTS (3001) ====="
for route in "users" "tasks" "notifications" "ticker" "channels"; do
  echo -n "Route /$route: "
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/$route
  echo ""
done

echo "===== DATABASE FILE USAGE ====="
# Check if the sqlite file is being written to
ls -la /var/www/job-tracker/service-job-tracker/*.sqlite

echo "===== RECENT ERROR LOGS ====="
pm2 logs job-tracker-api --lines 50 --nostream | grep -i "error"
