MAIN_JS=$(curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
echo "Main JS: $MAIN_JS"
echo "=== super-admin/dashboard ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'super-admin/dashboard'
echo "=== cm-eyebrow ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'cm-eyebrow'
echo "=== SuperAdminLicensing ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'SuperAdminLicensing'
echo "=== Suspense fallback ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'Loading'
