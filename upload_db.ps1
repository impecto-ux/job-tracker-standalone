
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading populated local database..."
$Src = "service-job-tracker\job_tracker.sqlite"
$Dest = "$ServerUser@$ServerIP" + ":/var/www/job-tracker/service-job-tracker/job_tracker.sqlite"
scp $Src $Dest
