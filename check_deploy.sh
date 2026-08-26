TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/email-login -H 'Content-Type: application/json' -d '{"email":"admin@getcaremaster.com","password":"***REMOVED***"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "Token: ${TOKEN:0:20}..."
echo "=== isSuperAdmin filter ==="
curl -s "http://localhost:5000/api/data/users?isSuperAdmin=true" -H "Authorization: Bearer $TOKEN"
echo ""
