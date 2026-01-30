# Repair Job Tracker Database Permissions
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Fixing permissions..."

# Use single quotes to ensure PowerShell treats this purely as a string and doesn't try to parse the 'if'
$RemoteCmd = 'cd /var/www/job-tracker/service-job-tracker; if [ -f job_tracker.sqlite.bak ]; then mv job_tracker.sqlite.bak job_tracker.sqlite; fi; chmod 666 job_tracker.sqlite; chmod 777 .; pm2 restart backend'

ssh $ServerUser@$ServerIP $RemoteCmd
