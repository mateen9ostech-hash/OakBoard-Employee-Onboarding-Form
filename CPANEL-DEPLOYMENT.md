# OakBoard Isolated cPanel Deployment

This deployment changes only the document root and database assigned to `onboarding.9ostech.com`. It does not use Passenger and does not require a global Apache rebuild or restart.

## 1. Prepare MySQL

In cPanel/phpMyAdmin, select the OakBoard database and import:

```text
database/mysql/schema.sql
```

Use a database user that has privileges only on this database. Rotate any password that has appeared in chat, screenshots, shell history, or documentation.

## 2. Create the private API configuration

On the server, create `/home/ostech/oakboard-config.php` based on `api/config.example.php` and add the real values privately. Then protect it:

```bash
chmod 600 /home/ostech/oakboard-config.php
chown ostech:ostech /home/ostech/oakboard-config.php
```

The file must stay outside `/home/ostech/public_html`.

## 3. Build locally or in an isolated source directory

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

The deployable artifact is `dist/`, not the repository root.

The checked-in `.env.production` contains only browser-public Supabase settings, so cPanel builds do not depend on an ignored local env file. The checked-in `.cpanel.yml` runs these validation/build steps automatically when **Deploy HEAD Commit** is selected in cPanel Git Version Control.

## 4. Deploy only this subdomain

Back up the current OakBoard subdomain document root. Replace only its contents with the contents of `dist/`. Do not modify the primary domain or another website's document root.

Expected production layout:

```text
/home/ostech/public_html/onboarding.9ostech.com/
  .htaccess
  index.html
  assets/
  api/
  task-icon.svg
```

The visible OakBoard logo and favicon are emitted as fingerprinted files under `assets/` so browser and Cloudflare caches refresh when the asset changes.

The included `.htaccess` disables directory indexing, preserves `/api`, serves real assets, and falls back to `index.html` for React Router URLs.

## 5. Supabase configuration

Allow this exact redirect URL in Supabase Authentication:

```text
https://onboarding.9ostech.com/auth/callback
```

Keep Confirm Email enabled and keep `{{ .Token }}` in the signup template because OakBoard accepts the six-digit OTP.

## 6. Acceptance checks

- `/sign-in`, `/help`, and a refreshed `/plans/{uuid}` route do not return 404.
- An unauthenticated `/api/plans` request returns HTTP 401 JSON.
- User A cannot load, update, archive, restore, or delete User B's plan UUID.
- New plans are inserted into MySQL with the correct `owner_id`.
- Archive, restore, delete, PDF download, and PDF email delivery work.
- No source files, `.env` file, database export, or directory listing is publicly accessible.

## Rollback

Restore only the backed-up `onboarding.9ostech.com` document root. The stable `main` branch and current hosted deployment remain unchanged until migration acceptance is complete.
