#!/bin/bash
echo "===== ENDPOINT TEST (DIRECT 3001) ====="
for p in "users" "tasks" "notifications" "ticker" "channels" "departments"; do
  echo -n "$p: "
  curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/$p
  echo ""
done

echo "===== ENDPOINT TEST (VIA NGINX 80) ====="
for p in "users" "tasks" "notifications" "ticker" "channels" "departments"; do
  echo -n "/api/$p: "
  curl -s -o /dev/null -w "%{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/$p
  echo ""
done

echo "===== SQLITE DATA CHECK ====="
cd /var/www/job-tracker/service-job-tracker
# Check counts of main tables
sqlite3 job_tracker.sqlite "SELECT 'Users: ' || count(*) FROM user;"
sqlite3 job_tracker.sqlite "SELECT 'Tasks: ' || count(*) FROM task;"
sqlite3 job_tracker.sqlite "SELECT 'Departments: ' || count(*) FROM department;"
sqlite3 job_tracker.sqlite "SELECT 'Channels: ' || count(*) FROM channel;"

echo "===== NGINX LOGS FOR 404S ====="
grep " 404 " /var/log/nginx/access.log | tail -n 10
