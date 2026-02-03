
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading Backend Fixes..."
$Dest1 = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/service-job-tracker/src/main.ts"
scp service-job-tracker/src/main.ts $Dest1

$Dest2 = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/service-job-tracker/src/channels/chat.gateway.ts"
scp service-job-tracker/src/channels/chat.gateway.ts $Dest2

Write-Host "Restarting Backend..."
ssh $ServerUser@$ServerIP "pm2 restart job-tracker-api"
