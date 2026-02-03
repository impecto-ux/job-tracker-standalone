#!/bin/bash
cd /var/www/job-tracker/service-job-tracker
echo "Removing old dist..."
rm -rf dist
echo "Extracting new dist..."
tar -xzf /root/dist.tar.gz
echo "Restarting PM2..."
pm2 restart job-tracker-api
echo "Deployment Complete."
