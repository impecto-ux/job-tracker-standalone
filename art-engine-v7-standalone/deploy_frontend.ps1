# Deploy Frontend (Art Engine v4)
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "🚀 Deploying Frontend to Server..." -ForegroundColor Cyan

# 1. Commit and Push Local Changes (Corrected config.ts)
git add .
git commit -m "Fix: Point API URL to port 3001 for production"
git push origin main

# 2. Remote Deployment
# Assumes 'art-engine-v4' directory exists. If not, we might need to verify path.
# We skip 'npm install' to speed it up unless needed, but 'npm run build' is mandatory for Next.js.
$RemoteCmd = 'cd /var/www/job-tracker/art-engine-v4; git pull; npm install; npm run build; pm2 restart frontend'

ssh $ServerUser@$ServerIP $RemoteCmd

Write-Host "✅ Frontend Deployment Complete!" -ForegroundColor Green
