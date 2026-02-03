#!/bin/bash
export PATH=$PATH:/root/.nvm/versions/node/v20.10.0/bin:/usr/local/bin:/usr/bin:/bin
cd /var/www/job-tracker/service-job-tracker

echo "===== INSTALLING DEPENDENCIES (Just in case) ====="
npm install

echo "===== REBUILDING BACKEND ====="
npm run build

echo "===== RESTARTING PM2 ====="
pm2 restart job-tracker-api

echo "===== LOGS ====="
pm2 logs job-tracker-api --lines 20 --nostream
