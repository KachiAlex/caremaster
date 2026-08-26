grep 'CACHE_NAME\|STATIC_CACHE' /var/www/caremaster/build/sw.js | head -4
echo "---"
curl -s https://getcaremaster.com/sw.js | grep 'CACHE_NAME\|STATIC_CACHE' | head -4
