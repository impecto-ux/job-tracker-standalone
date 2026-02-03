#!/bin/bash
echo "--- SQLITE DATA COUNT ---"
cd /var/www/job-tracker/service-job-tracker
sqlite3 job_tracker.sqlite "SELECT 'Users: ' || count(*) FROM user;"
sqlite3 job_tracker.sqlite "SELECT 'Tasks: ' || count(*) FROM task;"
sqlite3 job_tracker.sqlite "SELECT 'Deps: ' || count(*) FROM department;"

echo "--- NGINX ROUTE CHECK ---"
curl -s -o /dev/null -w "Code: %{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/users
echo ""
