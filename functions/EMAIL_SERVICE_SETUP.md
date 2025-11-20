# Email Service Setup Guide

## Overview
The email service is integrated with SendGrid to send payment link notifications to clients. Emails are queued in Firestore and processed by a scheduled Cloud Function every minute.

## Current Implementation
- ✅ SendGrid integration complete
- ✅ Emails are queued in the `emailQueue` collection
- ✅ Scheduled function processes the queue every minute
- ✅ Email templates are HTML-formatted with professional styling
- ✅ Error handling and retry mechanism (3 attempts)

## SendGrid Setup (Required for Production)

### Step 1: Get SendGrid API Key
1. Sign up for a SendGrid account at https://sendgrid.com
2. Go to Settings > API Keys: https://app.sendgrid.com/settings/api_keys
3. Click "Create API Key"
4. Name it (e.g., "Firebase Functions")
5. Select "Full Access" or "Restricted Access" with Mail Send permissions
6. Copy the API key (you'll only see it once!)

### Step 2: Verify Sender Email
1. Go to Settings > Sender Authentication: https://app.sendgrid.com/settings/sender_auth
2. Verify a Single Sender or set up Domain Authentication (recommended for production)
3. Use the verified email as your `from_email`

### Step 3: Configure Firebase Functions
Set the SendGrid API key and from email using Firebase Functions config:

```bash
cd functions
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
```

**Note:** If you're using Firebase Functions v2 (gen2), use environment variables instead:
```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set FROM_EMAIL
```

### Step 4: Deploy Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

## Testing

### Test Email Sending
1. Generate an invoice with a payment link from the admin dashboard
2. Check the `emailQueue` collection in Firestore
3. Verify the email is queued with status `queued`
4. Wait for the scheduled function to process it (runs every minute)
5. Check email delivery status in Firestore and SendGrid dashboard

### Monitor Email Queue
- Check `emailQueue` collection in Firestore
- Status values: `queued`, `sent`, `failed`
- View SendGrid Activity Feed: https://app.sendgrid.com/activity

### Check Function Logs
```bash
firebase functions:log --only processEmailQueueFunction
```

## Email Template Customization

The email template is in `emailService.ts` in the `sendPaymentLinkEmail` function. You can customize:
- Colors and styling
- Logo/branding
- Additional information
- Footer content

## Troubleshooting

### Emails Not Sending
1. **Check SendGrid API Key**: Verify it's set correctly
   ```bash
   firebase functions:config:get
   ```

2. **Check Sender Verification**: Ensure your `from_email` is verified in SendGrid

3. **Check Function Logs**: Look for errors in Firebase Functions logs
   ```bash
   firebase functions:log
   ```

4. **Check SendGrid Dashboard**: View activity feed for delivery issues

### Common Errors
- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Sender not verified
- **Rate Limit**: Too many emails sent (check SendGrid plan limits)

## SendGrid Free Tier Limits
- 100 emails/day
- Upgrade plan for higher limits

## Security Notes
- Never commit API keys to version control
- Use Firebase Functions config or secrets for sensitive data
- Rotate API keys regularly
- Monitor SendGrid activity for suspicious activity

### Option 2: Mailgun
1. Install Mailgun:
   ```bash
   npm install mailgun.js
   ```

2. Set environment variables:
   ```bash
   firebase functions:config:set mailgun.api_key="YOUR_MAILGUN_API_KEY"
   firebase functions:config:set mailgun.domain="YOUR_MAILGUN_DOMAIN"
   ```

### Option 3: Nodemailer with SMTP
1. Install Nodemailer:
   ```bash
   npm install nodemailer
   ```

2. Configure SMTP settings in environment variables

### Option 4: Firebase Extensions
Use the "Trigger Email" Firebase Extension which integrates with SendGrid or Mailgun automatically.

## Email Queue Monitoring
- Check the `emailQueue` collection in Firestore to monitor email status
- Status values: `queued`, `sent`, `failed`
- Failed emails can be retried manually or automatically

## Testing
1. Generate an invoice with a payment link
2. Check the `emailQueue` collection in Firestore
3. Verify the email is queued with status `queued`
4. Wait for the scheduled function to process it (runs every minute)
5. Check email delivery status

## Notes
- The email service is designed to be non-blocking - if email fails, invoice generation still succeeds
- Email templates are HTML-formatted and responsive
- All email sends are logged in the `auditLogs` collection

