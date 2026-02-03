#!/bin/bash
echo "===== INSTALLING SQLITE3 ====="
apt-get update && apt-get install -y sqlite3

echo "===== SQLITE DATA REPORT ====="
cd /var/www/job-tracker/service-job-tracker
sqlite3 job_tracker.sqlite "SELECT 'Users: ' || count(*) FROM user;"
sqlite3 job_tracker.sqlite "SELECT 'Tasks: ' || count(*) FROM task;"
sqlite3 job_tracker.sqlite "SELECT 'Departments: ' || count(*) FROM department;"
sqlite3 job_tracker.sqlite "SELECT 'Channels: ' || count(*) FROM channel;"
