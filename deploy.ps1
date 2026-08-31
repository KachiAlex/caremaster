# CareMaster Deployment Script
# Deploys frontend build and backend changes to the VPS
#
# Usage:
#   .\deploy.ps1              # Deploy both frontend and backend
#   .\deploy.ps1 -Frontend   # Deploy only frontend
#   .\deploy.ps1 -Backend    # Deploy only backend
#   .\deploy.ps1 -SkipBuild  # Deploy without rebuilding frontend

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$SkipBuild,
    [string]$VpsHost = "207.180.246.9",
    [string]$VpsUser = "root",
    [string]$RemoteFrontendPath = "/var/www/caremaster/build",
    [string]$RemoteBackendPath = "/var/www/caremaster-backend"
)

$ErrorActionPreference = "Stop"
$DeployBoth = -not $Frontend -and -not $Backend
$DeployFrontend = $Frontend -or $DeployBoth
$DeployBackend = $Backend -or $DeployBoth

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "  ERROR: $msg" -ForegroundColor Red }

# --- Verify SSH connectivity ---
Write-Step "Testing SSH connection to $VpsUser@$VpsHost"
$sshOk = ssh -o BatchMode=yes -o ConnectTimeout=5 "$VpsUser@$VpsHost" "echo SSH_OK" 2>&1
if ($sshOk -ne "SSH_OK") {
    Write-Err "SSH key auth failed. Ensure your public key is in ~/.ssh/authorized_keys on the VPS."
    exit 1
}
Write-Ok "SSH connection verified"

# --- Build frontend ---
if ($DeployFrontend -and -not $SkipBuild) {
    Write-Step "Building frontend"
    Push-Location $PSScriptRoot
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Frontend build failed"
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Ok "Frontend build complete"
}

# --- Deploy frontend ---
if ($DeployFrontend) {
    Write-Step "Deploying frontend to $VpsHost"
    $tmpDir = "/tmp/caremaster-build-deploy"
    ssh "$VpsUser@$VpsHost" "rm -rf $tmpDir && mkdir -p $tmpDir"
    scp -r "$PSScriptRoot/build/*" "$VpsUser@$VpsHost`:$tmpDir/"
    ssh "$VpsUser@$VpsHost" "rm -rf ${RemoteFrontendPath}_old && mv $RemoteFrontendPath ${RemoteFrontendPath}_old && mv $tmpDir $RemoteFrontendPath"
    Write-Ok "Frontend deployed to $RemoteFrontendPath"
}

# --- Deploy backend ---
if ($DeployBackend) {
    Write-Step "Deploying backend to $VpsHost"
    # Sync backend directory (excluding node_modules, .env, logs, tests)
    scp -r "$PSScriptRoot/backend/routes" "$VpsUser@$VpsHost`:$RemoteBackendPath/routes"
    scp -r "$PSScriptRoot/backend/middleware" "$VpsUser@$VpsHost`:$RemoteBackendPath/middleware" 2>$null
    scp -r "$PSScriptRoot/backend/services" "$VpsUser@$VpsHost`:$RemoteBackendPath/services" 2>$null
    scp -r "$PSScriptRoot/backend/utils" "$VpsUser@$VpsHost`:$RemoteBackendPath/utils" 2>$null
    scp -r "$PSScriptRoot/backend/database" "$VpsUser@$VpsHost`:$RemoteBackendPath/database" 2>$null
    scp "$PSScriptRoot/backend/server.js" "$VpsUser@$VpsHost`:$RemoteBackendPath/server.js" 2>$null
    scp "$PSScriptRoot/backend/package.json" "$VpsUser@$VpsHost`:$RemoteBackendPath/package.json" 2>$null
    scp "$PSScriptRoot/backend/knexfile.js" "$VpsUser@$VpsHost`:$RemoteBackendPath/knexfile.js" 2>$null

    # Install new dependencies (knex upgrade, etc.)
    Write-Step "Installing backend dependencies"
    ssh "$VpsUser@$VpsHost" "cd $RemoteBackendPath && npm install --production 2>&1 | tail -5"
    Write-Ok "Dependencies installed"

    # Run database migrations
    Write-Step "Running database migrations"
    $migrationOutput = ssh "$VpsUser@$VpsHost" "cd $RemoteBackendPath && npx knex migrate:latest --env production 2>&1"
    Write-Host $migrationOutput
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Migrations completed"
    } else {
        Write-Err "Migration failed (may need manual intervention)"
    }

    # Restart PM2
    ssh "$VpsUser@$VpsHost" "cd $RemoteBackendPath && pm2 restart caremaster-backend --update-env && sleep 2 && pm2 logs caremaster-backend --lines 3 --nostream"
    Write-Ok "Backend deployed and PM2 restarted"
}

# --- Verify ---
Write-Step "Verifying deployment"
$status = ssh "$VpsUser@$VpsHost" "pm2 list | grep caremaster-backend"
if ($status -match "online") {
    Write-Ok "Backend is online"
} else {
    Write-Err "Backend may not be running: $status"
}

Write-Host "`nDeployment complete!`n" -ForegroundColor Green
