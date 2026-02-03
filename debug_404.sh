#!/bin/bash
echo "===== CURL BACKEND DIRECT (3001) ====="
# Try a known endpoint, e.g. /users or /api/users if prefix existed (we think it doesnt)
curl -v http://127.0.0.1:3001/users 2>&1 | head -n 20

echo "===== CURL NGINX LOCAL (80) ====="
curl -v -H "Host: drokten.com" http://127.0.0.1/api/users 2>&1 | head -n 20

echo "===== NGINX ACCESS LOG (LAST 5) ====="
tail -n 5 /var/log/nginx/access.log

echo "===== NGINX ERROR LOG (LAST 5) ====="
tail -n 5 /var/log/nginx/error.log
