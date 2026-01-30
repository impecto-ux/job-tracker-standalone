# Repair Nginx Configuration (V2 - Using 127.0.0.1)
$ServerIP = "37.148.214.203"
$ServerUser = "root"

Write-Host "Updating Nginx to use 127.0.0.1..." -ForegroundColor Cyan

$Config = @"
server {
    listen 80;
    server_name 37.148.214.203;
    client_max_body_size 50M;

    # Frontend (Ana Sayfa)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }

    # API Yönlendirmesi
    location /api/ {
        rewrite ^/api/(.*) /`$1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
    }
}
"@

$RemoteCmd = "echo '$Config' > /etc/nginx/sites-available/default && nginx -t && systemctl restart nginx"

ssh $ServerUser@$ServerIP $RemoteCmd
