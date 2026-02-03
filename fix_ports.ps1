
$ServerIP = "37.148.214.203"
$ServerUser = "root"

# Command to kill processes on ports and restart PM2
$RemoteCmd = "pm2 stop all && fuser -k 3000/tcp || true && fuser -k 3001/tcp || true && pm2 restart all && echo '✅ Ports cleared and processes restarted'"

ssh $ServerUser@$ServerIP $RemoteCmd
