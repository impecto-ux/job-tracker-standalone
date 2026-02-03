
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Uploading dist.tar.gz and install script..."
$Dest1 = "$ServerUser@$ServerIP" + ":/root/dist.tar.gz"
scp service-job-tracker/dist.tar.gz $Dest1

$Dest2 = "$ServerUser@$ServerIP" + ":/root/install_dist.sh"
scp install_dist.sh $Dest2

Write-Host "Running install_dist.sh..."
ssh $ServerUser@$ServerIP "bash /root/install_dist.sh"
