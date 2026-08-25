#!/bin/bash
PGPASSWORD= psql -h localhost -p 5432 -U postgres -d caremaster -t -c "SELECT DISTINCT user_type FROM users ORDER BY user_type;"
