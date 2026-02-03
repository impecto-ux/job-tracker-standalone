#!/bin/bash
echo "===== PM2 LIST ====="
pm2 list

echo "===== NETSTAT 3001 ====="
netstat -tulpn | grep 3001

echo "===== BACKEND ENV ====="
grep -v "PASSWORD" /var/www/job-tracker/service-job-tracker/.env || echo ".env NOT FOUND"

echo "===== NGINX CONFIG ====="
cat /etc/nginx/sites-enabled/default || cat /etc/nginx/conf.d/default.conf

echo "===== BACKEND LOGS ====="
pm2 logs job-tracker-api --lines 50 --nostream
