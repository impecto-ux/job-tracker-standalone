#!/bin/bash
echo "===== PM2 LIST ====="
pm2 list

echo "===== BACKEND LOGS ====="
pm2 logs job-tracker-api --lines 50 --nostream

echo "===== LISTENING PORTS ====="
netstat -tulpn | grep 3001
netstat -tulpn | grep 5432

echo "===== DB CONFIG CHECK ====="
# Check env file for DB settings (masking password)
grep -v "PASSWORD" /var/www/job-tracker/service-job-tracker/.env

echo "===== NODE PROCESSES ====="
ps aux | grep node
