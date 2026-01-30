# Emergency Fix for Job Tracker Server
# Usage: .\fix_server.ps1

$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "🚑 Attempting to fix Server Database..." -ForegroundColor Cyan

$commands = "
    cd /var/www/job-tracker/service-job-tracker
    
    if [ -f job_tracker.sqlite.bak ]; then
        echo 'found backup file. restoring...'
        mv job_tracker.sqlite.bak job_tracker.sqlite
        echo 'database restored.'
    else
        echo 'no backup file found (database might be ok).'
    fi

    echo 'restarting backend service...'
    pm2 restart backend
    pm2 status
"

ssh $ServerUser@$ServerIP $commands

Write-Host "✅ Fix attempt complete. Try logging in again." -ForegroundColor Green
