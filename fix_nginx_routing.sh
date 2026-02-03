#!/bin/bash
# Remove rewrite and standardise
sed -i 's/rewrite \^\\\/api\\\/(.\*) \\\/\$1 break;//g' /etc/nginx/sites-enabled/default
# Restart Nginx
systemctl restart nginx
echo "Nginx restarted and rewrite removed"
