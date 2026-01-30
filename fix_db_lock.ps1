# Hard Reset Job Tracker Database Lock
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Performing Hard Reset on Database File..." -ForegroundColor Cyan

# 1. Stop backend to release handles
# 2. Copy sqlite to sqlite.new (fresh inode)
# 3. Move old sqlite to .stuck (backup)
# 4. Move .new to sqlite
# 5. Set full permissions
# 6. Restart

$RemoteCmd = 'cd /var/www/job-tracker/service-job-tracker; pm2 stop backend; cp job_tracker.sqlite job_tracker.sqlite.new; mv job_tracker.sqlite job_tracker.sqlite.stuck; mv job_tracker.sqlite.new job_tracker.sqlite; chmod 777 job_tracker.sqlite; chmod 777 .; pm2 restart backend'

ssh $ServerUser@$ServerIP $RemoteCmd
