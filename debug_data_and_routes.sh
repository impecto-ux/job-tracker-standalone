#!/bin/bash
echo "===== SQLITE DATA REPORT ====="
cd /var/www/job-tracker/service-job-tracker
sqlite3 job_tracker.sqlite "SELECT 'Users: ' || count(*) FROM user;"
sqlite3 job_tracker.sqlite "SELECT 'Tasks: ' || count(*) FROM task;"
sqlite3 job_tracker.sqlite "SELECT 'Departments: ' || count(*) FROM department;"

echo "===== NGINX PROXY TEST (NO REWRITE SIMULATION) ====="
# Check if /api/users (which Nginx turns into /users) works
echo -n "Nginx /api/users: "
curl -s -o /dev/null -w "%{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/users
echo ""

# Check if /api/api/users (which Nginx turns into /api/users) works
echo -n "Nginx /api/api/users: "
curl -s -o /dev/null -w "%{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/api/users
echo ""

echo "===== RECENT NGINX ACCESS LOGS (PREFIX CHECK) ====="
tail -n 20 /var/log/nginx/access.log | grep "/api"
