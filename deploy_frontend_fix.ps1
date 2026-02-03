
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading Frontend Fixes (config.ts, ChatInterface.tsx)..."
$Dest1 = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/art-engine-v4/src/lib/config.ts"
scp art-engine-v4/src/lib/config.ts $Dest1

$Dest2 = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/art-engine-v4/src/components/job-tracker/ChatInterface.tsx"
scp art-engine-v4/src/components/job-tracker/ChatInterface.tsx $Dest2

Write-Host "Restarting Frontend..."
ssh $ServerUser@$ServerIP "pm2 restart art-engine-v4"
