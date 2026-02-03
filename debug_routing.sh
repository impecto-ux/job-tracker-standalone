#!/bin/bash
echo "===== NGINX CONFIG ====="
cat /etc/nginx/sites-enabled/default

echo "===== SQLITE DB CHECK ====="
ls -l /var/www/job-tracker/service-job-tracker/job_tracker.sqlite

echo "===== RECENT BACKEND LOGS ====="
pm2 logs job-tracker-api --lines 20 --nostream
