echo "=== Status ==="
curl -s -o /dev/null -w "%{http_code}" https://getcaremaster.com/login
echo ""
echo "=== SW version ==="
curl -s https://getcaremaster.com/sw.js | head -2
echo "=== Main JS ==="
MAIN_JS=$(curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
echo "$MAIN_JS"
echo "=== Encryption key in JS ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'CareMaster_secure'
