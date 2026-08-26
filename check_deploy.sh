MAIN_JS=$(grep -oE 'static/js/main[^"]+\.js' /var/www/caremaster/build/index.html | head -1)
echo "Main JS: $MAIN_JS"
grep -c 'super-admin/dashboard' "/var/www/caremaster/build/$MAIN_JS"
echo "---"
grep -oE 'window\.location\.href=[^;]*super-admin[^;]*' "/var/www/caremaster/build/$MAIN_JS" | head -3
