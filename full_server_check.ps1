# Comprehensive Server Health Check
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Running Deep System Diagnostics..." -ForegroundColor Cyan

# Define the remote command as a single line string to avoid PowerShell parsing issues.
# We check:
# 1. Disk usage
# 2. Node processes
# 3. Ports listening
# 4. File permissions in the app dir
# 5. Last 30 lines of backend logs

$RemoteCmd = 'echo "--- 1. DISK SPACE ---"; df -h; echo "--- 2. NODE PROCESSES ---"; ps aux | grep node; echo "--- 3. LISTENING PORTS ---"; netstat -tulpn | grep LISTEN; echo "--- 4. FILE PERMISSIONS ---"; cd /var/www/job-tracker/service-job-tracker; ls -la; echo "--- 5. RECENT LOGS ---"; pm2 logs backend --lines 30 --nostream'

ssh $ServerUser@$ServerIP $RemoteCmd
