#!/bin/bash
cd /var/www/job-tracker/service-job-tracker
echo "--- REMOTE TABLES ---"
sqlite3 job_tracker.sqlite ".tables"
echo "--- REMOTE FILE SIZE ---"
ls -l job_tracker.sqlite
echo "--- RECENT PM2 LOGS ---"
pm2 logs job-tracker-api --lines 50 --nostream
