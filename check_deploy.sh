echo "=== HTML status ==="
curl -s -o /dev/null -w "%{http_code}" https://getcaremaster.com/
echo ""
echo "=== Main JS ==="
MAIN_JS=$(curl -s https://getcaremaster.com/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
echo "$MAIN_JS"
echo "=== Encryption key in JS ==="
curl -s "https://getcaremaster.com/$MAIN_JS" | grep -c 'CareMaster_secure'
echo "=== API test ==="
TOKEN=$(curl -s -X POST https://getcaremaster.com/api/auth/email-login -H 'Content-Type: application/json' -d '{"email":"admin@getcaremaster.com","password":"***REMOVED***"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -s "https://getcaremaster.com/api/data/users?isSuperAdmin=true" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('users:', d.get('success'), len(d.get('data',[])))"
curl -s "https://getcaremaster.com/api/data/institutions" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('institutions:', d.get('success'), len(d.get('data',[])))"
curl -s "https://getcaremaster.com/api/data/licenses" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('licenses:', d.get('success'), len(d.get('data',[])))"
