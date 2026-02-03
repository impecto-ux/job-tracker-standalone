#!/bin/bash
echo "--- ROUTE HEALTH ---"
curl -s -o /dev/null -w "Code: %{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/users
echo ""

echo "--- DATA INTEGRITY ---"
cd /var/www/job-tracker/service-job-tracker
sqlite3 job_tracker.sqlite "SELECT 'Users: ' || count(*) FROM users; SELECT 'Tasks: ' || count(*) FROM tasks;"

echo "--- FRONTEND CONFIG CHECK ---"
grep "getBaseUrl" /var/www/job-tracker/art-engine-v4/src/lib/config.ts -A 5
