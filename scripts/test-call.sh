#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:5002/api/auth/email-login -H 'Content-Type: application/json' -d @/tmp/test-login.json | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"]["token"])')
echo "Token: ${TOKEN:0:20}..."
curl -s -X POST http://localhost:5002/api/data/calls -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d @/tmp/test-call.json
echo ""
