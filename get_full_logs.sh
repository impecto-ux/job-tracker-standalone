#!/bin/bash
echo "--- FULL PM2 LOGS ---"
pm2 logs job-tracker-api --lines 100 --nostream
echo "--- FULL TABLE LIST ---"
sqlite3 /var/www/job-tracker/service-job-tracker/job_tracker.sqlite .tables
