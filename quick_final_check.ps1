
$ServerIP = "37.148.214.203"
$ServerUser = "root"

$RemoteCmd = "
echo '--- DATA COUNTS ---'
cd /var/www/job-tracker/service-job-tracker && sqlite3 job_tracker.sqlite 'SELECT \"Users: \" || count(*) FROM user; SELECT \"Tasks: \" || count(*) FROM task; SELECT \"Departments: \" || count(*) FROM department;'
echo '--- NGINX STATUS ---'
curl -s -o /dev/null -w 'Code: %{http_code}' -H 'Host: drokten.com' http://127.0.0.1/api/users
"

ssh $ServerUser@$ServerIP $RemoteCmd
