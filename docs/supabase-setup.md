# Supabase Setup

VoltOps now has a hosted Supabase project for shared development.

## Project

- Project name: `cms-voltops`
- Project ref: `yplkmowedhdcclxdgtst`
- Region: `eu-central-1`
- API URL: `https://yplkmowedhdcclxdgtst.supabase.co`

## Mobile Environment

The mobile app uses Supabase only for authentication and session token retrieval. Business data must come from the Express API:

```sh
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://yplkmowedhdcclxdgtst.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_NzbjbbxVud_ZZmHcpP0XBw_Pw-vgUIc
```

Do not put service-role keys or database credentials in the mobile app.

`EXPO_PUBLIC_AUTH_REDIRECT_URL` is optional. Leave it unset in Expo Go so the app generates an `exp://.../--/auth/callback` URL. Development and production builds automatically use `voltops://auth/callback`; set the variable only when you need to force a specific callback URL.

For signup email confirmation, add these in Supabase Dashboard > Authentication > URL Configuration > Additional Redirect URLs:

```txt
voltops://**
exp://**
```

Expo Go uses `exp://**`. Development builds use `voltops://**`.

## API-Only Data Boundary

- Supabase Auth is the identity provider.
- Supabase Postgres is the canonical database.
- Mobile and admin clients must not query business tables through the Supabase Data API.
- Express is the only business-data boundary and connects to Supabase Postgres with `DATABASE_URL`.
- Mobile sends `Authorization: Bearer <Supabase access token>` to the Express API.
- User-owned API endpoints derive the user from the verified JWT, never from mobile request params or body fields.
- All public tables have RLS enabled.
- Anonymous and authenticated direct reads for `stations` and `plugs` are removed.

## API Database

Supabase Postgres is the canonical database. The Express API must connect to it through `DATABASE_URL`.

Use the Supabase Dashboard `Connect` panel to copy the Postgres connection string. For local long-running API processes, prefer the direct database URL when the network supports it:

```sh
DATABASE_URL=postgresql://postgres:<DB_PASSWORD>@db.yplkmowedhdcclxdgtst.supabase.co:5432/postgres?sslmode=require
```

If the local network cannot reach the direct database host, use the session pooler string copied from the Supabase Dashboard instead.

The database password is secret. Keep it in a local `.env` file or deployment secret store, not in git.

## Seed and verification

After migrations are applied, the API package provides public-table-only seed utilities:

```sh
pnpm --filter @voltops/api db:seed
pnpm --filter @voltops/api db:verify
```

For a destructive reset plus seed, create a manual Supabase backup first, then run:

```sh
pnpm --filter @voltops/api db:reset-seed -- --force
```

The seed scripts do not create Supabase Auth users. Seeded `public.users` rows are deterministic app records that can link to real Supabase Auth users by matching email on first login.
