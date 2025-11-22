@echo off
REM Deployment script for Windows
REM Usage: deploy.bat [server-user] [server-ip] [deploy-path]

set SERVER_USER=%1
if "%SERVER_USER%"=="" set SERVER_USER=root

set SERVER_IP=%2
if "%SERVER_IP%"=="" set SERVER_IP=your-server-ip

set DEPLOY_PATH=%3
if "%DEPLOY_PATH%"=="" set DEPLOY_PATH=/var/www/elderx

echo Building application...
call npm run build

if not exist "build" (
    echo Build failed! No build directory found.
    exit /b 1
)

echo Copying files to server...
scp -r build\ %SERVER_USER%@%SERVER_IP%:%DEPLOY_PATH%/

echo Restarting service...
ssh %SERVER_USER%@%SERVER_IP% "sudo systemctl restart nginx || pm2 restart elderx || true"

echo Deployment complete!
echo Your app should be available at http://%SERVER_IP%

