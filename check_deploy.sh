echo "=== Main JS ==="
MAIN_JS=$(curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
echo "$MAIN_JS"
echo "=== Encryption key ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'CareMaster_secure'
echo "=== Test remove admin (writable fields) ==="
TOKEN=$(curl -s -X POST https://getcaremaster.com/api/auth/email-login -H 'Content-Type: application/json' -d '{"email":"admin@getcaremaster.com","password":"***REMOVED***"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -s -X PUT "https://getcaremaster.com/api/data/users/abebfdaa-37d7-4360-b754-acfa917c3b60" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"userType":"admin","institutionId":"559fdd3b-f98e-46f8-b295-4cdaf20127d5"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('update success:', d.get('success'))"
