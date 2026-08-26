PGPASSWORD=***REMOVED*** psql -h 127.0.0.1 -U elderx_user -d elderx_app -c "DELETE FROM users WHERE email='testadmin_create@test.com'" 2>&1
echo "CLEANED"
