
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading ecosystem config..."
$DestConfig = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/art-engine-v4/ecosystem.config.js"
scp ecosystem.config.js $DestConfig

Write-Host "Uploading setup.sh..."
$DestSetup = "$ServerUser@$ServerIP" + ":/root/setup.sh"
scp setup.sh $DestSetup

Write-Host "Running setup.sh..."
ssh $ServerUser@$ServerIP "bash /root/setup.sh"
