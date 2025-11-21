#!/bin/bash

# SendGrid Setup Script for Firebase Functions
# This script helps you configure SendGrid for email notifications

echo "=========================================="
echo "SendGrid Setup for Firebase Functions"
echo "=========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "📋 Prerequisites:"
echo "1. SendGrid account (sign up at https://sendgrid.com)"
echo "2. SendGrid API Key (from https://app.sendgrid.com/settings/api_keys)"
echo "3. Verified sender email in SendGrid"
echo ""

read -p "Do you have a SendGrid API key? (y/n): " has_key

if [ "$has_key" != "y" ]; then
    echo ""
    echo "Please:"
    echo "1. Sign up at https://sendgrid.com"
    echo "2. Create an API key at https://app.sendgrid.com/settings/api_keys"
    echo "3. Verify a sender email at https://app.sendgrid.com/settings/sender_auth"
    echo ""
    exit 0
fi

echo ""
read -p "Enter your SendGrid API Key: " api_key
read -p "Enter your verified sender email (e.g., noreply@yourdomain.com): " from_email

if [ -z "$api_key" ] || [ -z "$from_email" ]; then
    echo "❌ API key and email are required"
    exit 1
fi

echo ""
echo "Configuring Firebase Functions..."

# Set Firebase Functions config
firebase functions:config:set sendgrid.api_key="$api_key"
firebase functions:config:set sendgrid.from_email="$from_email"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Build the functions: cd functions && npm run build"
echo "2. Deploy the functions: firebase deploy --only functions"
echo ""
echo "To verify configuration:"
echo "  firebase functions:config:get"
echo ""

