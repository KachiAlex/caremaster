@echo off
REM SendGrid Setup Script for Firebase Functions (Windows)
REM This script helps you configure SendGrid for email notifications

echo ==========================================
echo SendGrid Setup for Firebase Functions
echo ==========================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Firebase CLI is not installed.
    echo Install it with: npm install -g firebase-tools
    exit /b 1
)

echo Prerequisites:
echo 1. SendGrid account (sign up at https://sendgrid.com)
echo 2. SendGrid API Key (from https://app.sendgrid.com/settings/api_keys)
echo 3. Verified sender email in SendGrid
echo.

set /p has_key="Do you have a SendGrid API key? (y/n): "

if /i not "%has_key%"=="y" (
    echo.
    echo Please:
    echo 1. Sign up at https://sendgrid.com
    echo 2. Create an API key at https://app.sendgrid.com/settings/api_keys
    echo 3. Verify a sender email at https://app.sendgrid.com/settings/sender_auth
    echo.
    exit /b 0
)

echo.
set /p api_key="Enter your SendGrid API Key: "
set /p from_email="Enter your verified sender email (e.g., noreply@yourdomain.com): "

if "%api_key%"=="" (
    echo [ERROR] API key is required
    exit /b 1
)
if "%from_email%"=="" (
    echo [ERROR] Email is required
    exit /b 1
)

echo.
echo Configuring Firebase Functions...

REM Set Firebase Functions config
firebase functions:config:set sendgrid.api_key="%api_key%"
firebase functions:config:set sendgrid.from_email="%from_email%"

echo.
echo [SUCCESS] Configuration complete!
echo.
echo Next steps:
echo 1. Build the functions: cd functions ^&^& npm run build
echo 2. Deploy the functions: firebase deploy --only functions
echo.
echo To verify configuration:
echo   firebase functions:config:get
echo.

pause

