echo "=== sw.js cache version ==="
curl -s https://getcaremaster.com/sw.js | head -3
echo ""
echo "=== index.html main JS ==="
curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1
echo ""
echo "=== SuperAdminRoute in deployed JS ==="
MAIN_JS=$(curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'SuperAdminRoute'
