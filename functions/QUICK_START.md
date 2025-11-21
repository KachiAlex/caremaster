# SendGrid Email Integration - Quick Start

## ✅ Integration Complete!

SendGrid has been integrated into the email service. The system is ready to send payment link emails once configured.

## 🚀 Quick Setup (3 Steps)

### 1. Get SendGrid API Key
- Go to: https://app.sendgrid.com/settings/api_keys
- Click "Create API Key"
- Copy the key (you'll only see it once!)

### 2. Verify Sender Email
- Go to: https://app.sendgrid.com/settings/sender_auth
- Verify a Single Sender email (e.g., noreply@yourdomain.com)

### 3. Configure Firebase
Run the setup script:
```bash
# Windows
functions\SENDGRID_SETUP.bat

# Linux/Mac
bash functions/SENDGRID_SETUP.sh
```

Or manually:
```bash
firebase functions:config:set sendgrid.api_key="YOUR_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
```

### 4. Deploy
```bash
cd functions
npm run build
firebase deploy --only functions
```

## 📧 How It Works

1. **Invoice Generated**: When an admin generates an invoice with a payment link
2. **Email Queued**: Email is added to `emailQueue` collection in Firestore
3. **Email Sent**: Scheduled function (runs every minute) processes queue and sends via SendGrid
4. **Status Updated**: Email status updated to `sent` or `failed` in Firestore

## 🔍 Monitoring

- **Firestore**: Check `emailQueue` collection for email status
- **SendGrid Dashboard**: View delivery status at https://app.sendgrid.com/activity
- **Function Logs**: `firebase functions:log --only processEmailQueueFunction`

## ⚙️ Configuration

Current configuration location: `functions/src/emailService.ts`

- API Key: From Firebase Functions config
- From Email: From Firebase Functions config
- Email Template: HTML template in `sendPaymentLinkEmail` function

## 🐛 Troubleshooting

**Emails not sending?**
1. Check API key: `firebase functions:config:get`
2. Verify sender email in SendGrid dashboard
3. Check function logs: `firebase functions:log`
4. Check SendGrid activity feed

**Common Issues:**
- 401 Unauthorized → Invalid API key
- 403 Forbidden → Sender not verified
- Rate limit → Check SendGrid plan limits (free tier: 100/day)

## 📚 More Info

See `EMAIL_SERVICE_SETUP.md` for detailed documentation.

