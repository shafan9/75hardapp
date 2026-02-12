# Notifications Setup (Real Channels)

This app now supports real delivery for:
- In-app notifications
- Push notifications (Web Push)
- Email (Resend)
- SMS (Twilio)

## 1. Apply database migration

Open Supabase SQL Editor for project `huqaeiebfgcbxkvuuqtb` and run:

- `supabase/migrations/20260212_add_real_notification_channels.sql`

This adds:
- `user_settings` channel fields
- `push_subscriptions`
- `in_app_notifications`
- `notification_deliveries`

## 2. Configure app environment variables

Set these in Netlify Site Settings -> Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_CRON_SECRET`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Reference: `.env.local.example`

## 3. Generate VAPID keys (for push)

Run locally:

```bash
node -e "const webpush=require('web-push'); console.log(webpush.generateVAPIDKeys())"
```

Use returned keys for:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 4. Deploy

```bash
netlify deploy --prod
```

## 5. Verify each channel

In app -> `Profile`:
1. Enable desired channels.
2. Set phone/timezone/reminder time.
3. Click test buttons:
- `Test In-App`
- `Test Push`
- `Test Email`
- `Test SMS`

In-app notifications are visible at:
- `/dashboard/notifications`

## 6. Cron behavior

A Netlify Scheduled Function runs every 15 minutes:
- `netlify/functions/send-reminders.js`

It calls:
- `POST /api/cron/send-reminders` (Bearer token with `NOTIFICATION_CRON_SECRET`)

It sends reminders only when:
- User is within their reminder-time window
- Required daily tasks are still incomplete
- Channel is enabled in `user_settings`
