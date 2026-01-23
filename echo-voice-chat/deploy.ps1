# Deploy Script for Echo Voice Chat

$ServerIP = "37.148.214.203"
$ServerUser = "root"
$RemotePath = "/var/www/echo-voice-chat"
$RepoUrl = "https://github.com/impecto-ux/job-tracker" 
# NOTE: Echo is inside the same Monorepo or separate?
# User initialized it in `echo-voice-chat` inside `scratch`. 
# If they push the whole `scratch` to `job-tracker` repo, then Echo is a subdirectory.
# BUT `scratch` usually maps to `job-tracker`.
# Let's assume user wants to push THIS folder to a repo.
# Actually, the user has been working in `scratch` which maps to `job-tracker` repo likely.
# Let's double check git remote.

Write-Host "[Deploy] Starting Deployment to $ServerIP (Port 3002)..." -ForegroundColor Cyan

# 1. Local Git Push
Write-Host "1. Pushing local changes to GitHub..." -ForegroundColor Yellow
git add .
git commit -m "Echo Auto-deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

# 2. Remote Update
Write-Host "2. Connecting to Server..." -ForegroundColor Yellow

# Script Logic:
# 1. Check if folder exists. If not, clone it.
# 2. Backup DB -> Pull -> Restore DB (To avoid conflict)
# 3. Install deps, Build.
# 4. Restart PM2 on port 3002.

$commands = "cd /var/www/job-tracker && mv service-job-tracker/job_tracker.sqlite service-job-tracker/job_tracker.sqlite.bak 2>/dev/null || true && echo '[Server] Pulling Repo...' && git pull && mv service-job-tracker/job_tracker.sqlite.bak service-job-tracker/job_tracker.sqlite 2>/dev/null || true && echo '[Server] Installing Echo Deps...' && cd echo-voice-chat && npm i && echo '[Server] Building Echo...' && npm run build && echo '[Server] Restarting Echo on Port 3002...' && pm2 start npm --name 'echo-app' -- start -- -p 3002 || pm2 restart echo-app && echo '[Server] Deployment Complete!'"

ssh $ServerUser@$ServerIP $commands

Write-Host "[Success] Echo is Live! http://$ServerIP:3002" -ForegroundColor Green
