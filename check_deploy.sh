MAIN_JS=$(grep -oE 'static/js/main[^"]+\.js' /var/www/caremaster/build/index.html | head -1)
echo "Main JS: $MAIN_JS"
grep -c 'SuperAdminRoute' "/var/www/caremaster/build/$MAIN_JS"
echo "---"
curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1
