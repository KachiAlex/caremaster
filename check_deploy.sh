MAIN_JS=$(curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
echo "Main JS: $MAIN_JS"
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'stale session will be replaced'
echo "---"
curl -s https://getcaremaster.com/sw.js | head -2
