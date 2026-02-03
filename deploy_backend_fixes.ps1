
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading Backend Fixes (main.ts, app.module.ts)..."
# Just upload the dist files for speed since we already have the source updated locally
# But better to upload the SRC and trigger a build or just upload the compiled versions.
# I will upload the src files since I don't have a local build dir for production VPS.
# Wait, I SHOULD upload the whole service-job-tracker if I want to be safe.
# Actually, I'll just upload the specific files and run npm install + build remotely.

$DestMain = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/service-job-tracker/src/main.ts"
$DestApp = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/service-job-tracker/src/app.module.ts"

scp service-job-tracker/src/main.ts $DestMain
scp service-job-tracker/src/app.module.ts $DestApp

Write-Host "Rebuilding Backend on Server..."
$BuildCmd = "cd /var/www/job-tracker/service-job-tracker && npm install && npm run build && pm2 restart job-tracker-api"
ssh $ServerUser@$ServerIP $BuildCmd
