#!/bin/bash
cd /var/www/caremaster-backend
source .env
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clients' ORDER BY ordinal_position;"
