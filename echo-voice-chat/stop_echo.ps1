# Stop Script for Echo Voice Chat

$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "🛑 Stopping Echo App on Server..." -ForegroundColor Red

# Command to stop and delete the process so it stops listening on port 3002
# We use '|| true' to prevent error if it's already stopped
$commands = "pm2 stop echo-app && pm2 delete echo-app || echo 'Echo app was not running.'"

ssh $ServerUser@$ServerIP $commands

Write-Host "✅ Echo App has been shut down." -ForegroundColor Green
