#!/bin/bash
echo "===== ENDPOINT VERIFICATION (NGINX) ====="
for p in "users" "tasks" "notifications" "ticker" "channels"; do
  echo -n "/api/$p: "
  curl -s -o /dev/null -w "%{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/$p
  echo ""
done

echo "===== SQLITE DATA VERIFICATION ====="
cd /var/www/job-tracker/service-job-tracker
sqlite3 job_tracker.sqlite "SELECT 'Users: ' || count(*) FROM user;"
sqlite3 job_tracker.sqlite "SELECT 'Tasks: ' || count(*) FROM task;"
sqlite3 job_tracker.sqlite "SELECT 'Departments: ' || count(*) FROM department;"

echo "===== PM2 PROCESS UPTIME ====="
pm2 list | grep -E "job-tracker-api|art-engine-v4"
