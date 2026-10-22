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

Reminders are **not scheduled by default**. An authorized external scheduler can
call `POST /api/cron/send-reminders` with
`Authorization: Bearer <NOTIFICATION_CRON_SECRET>`.

The optional `netlify/functions/send-reminders.js` relay also requires POST and
the same bearer token before it makes any downstream request. Do not expose the
token to browser code. Adding a Netlify schedule declaration alone does not
authenticate a caller and is not a supported way to enable this relay.

It sends reminders only when:
- User is within their reminder-time window
- Required daily tasks are still incomplete
- Channel is enabled in `user_settings`
