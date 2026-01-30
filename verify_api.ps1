# Verify API is responding locally
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Testing Local API Connectivity..." -ForegroundColor Cyan

# Curl the root and a health endpoint (if any), or just check if it accepts connection
# We'll try to get the 'Hello World' or 404 from root, which proves it's up.
$RemoteCmd = 'curl -I http://localhost:3001/tasks'

ssh $ServerUser@$ServerIP $RemoteCmd
