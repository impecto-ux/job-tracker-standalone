# Deploy Server (Fixed)
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "🚀 Deploying to Server..." -ForegroundColor Cyan

# 1. Commit and Push Local Changes
git add .
git commit -m "Fix: Enable CORS and update deploy script"
git push origin main

# 2. Remote Deployment
# Using single quotes for the remote command string to prevent PowerShell from parsing special chars like && or ;
# We also REMOVED the database moving logic because sqlite should be ignored by git anyway.
$RemoteCmd = 'cd /var/www/job-tracker/service-job-tracker; git pull; npm install; npm run build; pm2 restart backend'

# Execute SSH
ssh $ServerUser@$ServerIP $RemoteCmd

Write-Host "✅ Deployment Complete!" -ForegroundColor Green
