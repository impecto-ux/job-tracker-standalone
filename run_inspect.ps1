
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading inspect_api_and_db.sh..."
$Dest = "$ServerUser@$ServerIP" + ":/root/inspect_api_and_db.sh"
scp inspect_api_and_db.sh $Dest

Write-Host "Running inspect_api_and_db.sh..."
ssh $ServerUser@$ServerIP "bash /root/inspect_api_and_db.sh"
