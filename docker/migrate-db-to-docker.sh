#!/usr/bin/env bash
# migrate-db-to-docker.sh — move the native PostgreSQL data into the
# containerized `db` service (caremaster-db).
#
# Run ON THE VPS after `docker compose up -d db` has started an EMPTY
# caremaster-db. Dumps the native elderx_app DB and restores it into the
# container, then verifies table counts.
#
# Usage: sudo bash docker/migrate-db-to-docker.sh
set -euo pipefail

DB_NAME="${DB_NAME:-elderx_app}"
DB_USER="${DB_USER:-elderx_user}"
DUMP=/tmp/caremaster-pre-docker.dump

echo "==> Dumping native database '$DB_NAME'..."
sudo -u postgres pg_dump -Fc "$DB_NAME" -f "$DUMP"
ls -lh "$DUMP"

echo "==> Restoring into caremaster-db container..."
# postgres image runs as 'postgres' superuser inside the container.
docker exec -i caremaster-db pg_restore -U postgres -d "$DB_NAME" --clean --if-exists < "$DUMP"

echo "==> Verifying row counts..."
for t in users clients telemedicine_appointments telemedicine_calls notifications signaling; do
  c=$(docker exec -i caremaster-db psql -U postgres -d "$DB_NAME" -tAc "SELECT count(*) FROM $t" 2>/dev/null || echo "n/a")
  echo "  $t: $c"
done

echo "==> Done. Keep the native postgres until you've verified the stack, then:"
echo "    systemctl disable --now postgresql"
rm -f "$DUMP"
