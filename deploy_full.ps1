
# Deploy Full Stack (Frontend + Backend)
$ServerIP = "37.148.214.203"
$ServerUser = "root"
$RemoteRoot = "/var/www/job-tracker"

Write-Host "Starting Full Stack Deployment..." -ForegroundColor Cyan

# 1. Local Git Operations
Write-Host "Committing and Pushing changes..." -ForegroundColor Yellow
git add .
# Check if there are changes to commit to avoid exit code 1
if ($(git status --porcelain)) {
    git commit -m "Deployment Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
else {
    Write-Host "No changes to commit. Proceeding..." -ForegroundColor Gray
}

git push origin master-backup

# 2. Remote Operations
Write-Host "Connecting to VPS for Build and Restart..." -ForegroundColor Yellow

$RemoteCmd = @"
    set -e
    echo 'Pulling latest changes...'
    cd $RemoteRoot
    git pull origin master-backup

    echo 'Building Backend (service-job-tracker)...'
    cd service-job-tracker
    npm install --no-audit
    npm run build
    # Restart or Start PM2 process
    pm2 restart job-tracker-api || pm2 start dist/main.js --name job-tracker-api

    echo 'Building Frontend (art-engine-v4)...'
    cd ../art-engine-v4
    npm install --no-audit
    npm run build
    # Restart or Start PM2 process
    pm2 restart art-engine-v4 || pm2 start npm --name art-engine-v4 -- start

    echo 'Deployment Successful!'
"@

# Note: This will prompt for password if keys are not set up
ssh $ServerUser@$ServerIP $RemoteCmd
