# CareMaster — Containerized Deployment

The entire application runs as 4 Docker services defined in `docker-compose.yml`:

| Service | Container | Image | Role |
|---|---|---|---|
| `web` | caremaster-web | built from `./Dockerfile` | Nginx: serves React build, proxies `/api` → api:5000, TLS edge |
| `api` | caremaster-api | built from `backend/Dockerfile` | Node/Express backend on :5000 (internal only) |
| `db` | caremaster-db | postgres:16-alpine | PostgreSQL, named volume `pgdata` |
| `coturn` | caremaster-turn | coturn/coturn:4.6 | TURN/STUN for WebRTC (host networking) |

## Prerequisites

- Docker Engine 20.10+ and Compose (`docker compose` v2 or `docker-compose` 1.29+)
- `backend/.env` — full backend env (JWT secret, R2 keys, SMTP, Paystack, TURN creds, etc.)
- A `.env` next to `docker-compose.yml` with at minimum:
  ```
  POSTGRES_PASSWORD=<strong password>
  POSTGRES_DB=elderx_app
  POSTGRES_USER=elderx_user
  ```
- TLS: host `/etc/letsencrypt` is bind-mounted into `web` read-only — host certbot continues to renew; run `docker compose restart web` after renewals (or add a certbot deploy hook).

## Run

```bash
docker compose up -d --build      # build web + api, start everything
docker compose ps                 # status + healthchecks
docker compose logs -f api        # follow backend logs
docker compose exec api sh        # shell into backend
docker compose exec db psql -U elderx_user -d elderx_app
```

## First boot of a fresh database

```bash
RUN_MIGRATIONS=true docker compose up -d api
# then apply the SQL migrations in backend/migrations/:
for f in backend/migrations/*.sql; do
  docker compose exec -T db psql -U elderx_user -d elderx_app -f - < "$f"
done
```

## Migrating the existing VPS data into the container

```bash
docker compose up -d db                        # start empty container DB
sudo bash docker/migrate-db-to-docker.sh       # dump native -> restore container
# verify counts, then bring the whole stack up and cut over Nginx traffic
```

Cutover on the VPS: stop host `nginx` serving the site, disable `postgresql` and `coturn` system services, then `docker compose up -d`. PM2's `caremaster-backend` should be stopped (`pm2 delete caremaster-backend` + `pm2 save`) so port 5000 is freed — the container binds it only inside the compose network.

## Volumes

- `pgdata` — database files (back up with `docker compose exec db pg_dump -Fc elderx_app > backup.dump`)
- `api-logs` — winston `combined.log`/`error.log` from the backend

## Notes

- `api` and `db` expose **no host ports** — only `web` (80/443) is reachable, plus coturn via host networking.
- `web` serves same-origin `/api` calls — the React build uses `REACT_APP_API_URL=/api` via build args in compose.
- Healthchecks: `web` → `GET /health`, `api` → `GET /api/health`, `db` → `pg_isready`.
- coturn uses host networking because TURN relay allocations span the dynamic UDP range; it reads the host `/etc/turnserver.conf` (template: `docker/turnserver.conf.example`).
