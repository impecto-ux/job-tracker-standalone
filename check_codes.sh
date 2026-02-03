#!/bin/bash
echo "BACKEND /users CODE:"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/users

echo "\nBACKEND /channels CODE:"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/channels

echo "\nNGINX /api/users CODE:"
curl -s -o /dev/null -w "%{http_code}" -H "Host: drokten.com" http://127.0.0.1/api/users
