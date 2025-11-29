## Data Connect deployment reference

This project uses Firebase Data Connect to automatically build the Postgres schema/connector via `firebase deploy`. The `remoteSource` pointing at the Git repo is already configured in `firebase.json`, but we keep this file as a reference for future updates.

### Remote source
- **Repository**: `https://github.com/KachiAlex/elderx`
- **Branch / ref**: `main`
- **Firebase config**: set via the `dataconnect.remoteSource` block in `firebase.json`

When you change the schema/connector sources, update the `dataconnect` directory (schema/ + example connector) in this repo, push the changes to `main`, then run `firebase deploy` again (the deploy will fetch the latest code via the remote source above).

### Cloud SQL target info
- **Project**: `elderx-f5c2b`
- **Region**: `us-central1`
- **Instance ID**: `care-master-fdc`
- **Database name**: `fdcdb`
- **Authorized network**: includes `35.235.0.0/16` (Firebase Data Connect IP block)
- **SSL mode**: `ALLOW_UNENCRYPTED_AND_ENCRYPTED` with Google-managed CA
- **Connection type**: Public IP (private is disabled)

If connectivity changes (new IP, private networking, rotated password), update `dataconnect/dataconnect.yaml` with the correct `instanceId`, credentials, and datasource settings before redeploying.

### Permissions & secrets
The Data Connect service account (`p987610993096-e051z4@gcp-sa-cloud-sql.iam.gserviceaccount.com`) should keep:

1. `roles/cloudsql.client`
2. `roles/secretmanager.viewer`
3. `roles/secretmanager.secretAccessor`

If you store database credentials in Secret Manager, ensure the connector references them and the latest secret version is deployed. Otherwise, keep the username/password in `dataconnect/dataconnect.yaml` (rotate with caution).

### Related environment variables
- `SENDGRID_API_KEY` – used by Functions’ `emailService` for SendGrid integration  
- `FROM_EMAIL` – optional override for the sender address (defaults to `noreply@caremaster.com`)

These can be provided via `firebase functions:config:set` replacements or Secret Manager + `firebase env:set` before calling `firebase deploy`.



