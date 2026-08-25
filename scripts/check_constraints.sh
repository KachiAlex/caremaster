#!/bin/bash
PGPASSWORD= psql -h localhost -p 5432 -U postgres -d caremaster -t -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'users'::regclass AND contype = 'c';"
