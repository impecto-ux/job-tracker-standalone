#!/bin/bash
echo "--- DIRECT CALL (3001) /api/users ---"
curl -s -o /dev/null -w "Code: %{http_code}" http://127.0.0.1:3001/api/users
echo ""

echo "--- DIRECT CALL (3001) /users (Old path) ---"
curl -s -o /dev/null -w "Code: %{http_code}" http://127.0.0.1:3001/users
echo ""

echo "--- NGINX SITES ---"
ls /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/*
