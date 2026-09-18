#!/bin/bash
cd /var/www/caremaster-backend
source .env
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT id, name, medical_conditions, allergies, medications, blood_type, genotype, emergency_contact_name, emergency_contact_phone FROM clients ORDER BY created_at DESC LIMIT 5;"
