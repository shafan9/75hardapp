# 75 Squad

A lightweight 75-day challenge tracker built for small groups.

Core flow:
- Sign in with email + password
- Create a squad (or join via invite link)
- Check off daily tasks
- See squad progress

## Live

- App: `https://75-squad-challenge.netlify.app`

## Local Development

1. Install deps

```bash
npm install
```

2. Configure env

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Run dev server

```bash
npm run dev
```

## Deploy (Netlify)

This repo is set up for Netlify Next.js deploys via `netlify.toml`.

1. Set env vars in Netlify (Site settings -> Environment variables)

Reference: `.env.local.example`

2. Deploy

```bash
netlify deploy --prod
```

## Notifications

Optional real channels are supported (in-app, push, email, SMS).

Docs:
- `docs/notifications-setup.md`
