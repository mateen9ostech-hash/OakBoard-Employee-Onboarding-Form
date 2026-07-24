# OakBoard Employee Onboarding Plans

OakBoard creates, stores, previews, exports, and emails role-specific onboarding
plans for `9ostech.com` users.

## Stack

```text
React + TypeScript + Vite
        |
same-origin PHP REST API
        |
cPanel MySQL + Mailgun
```

Production runs the frontend and PHP API together in one Docker container.
MySQL remains the existing external cPanel database. Docker does not create,
replace, restart, or modify another website or database.

## Local development

Requirements:

- Node.js 20.19-24.x
- npm 10-11
- PHP 8.1+ for the local API

Install and start the frontend:

```powershell
npm ci
npm run dev
```

For full API testing, keep the private PHP config outside the repository and run
the API in a second terminal:

```powershell
$env:OAKBOARD_CONFIG_FILE = "C:\Users\Mateen\Downloads\oakboard-config.php"
npm run dev:api
```

Open <http://127.0.0.1:3000/sign-in>. Vite proxies `/api` to
`http://127.0.0.1:8080`.

## Configuration

Browser-public Vite values are documented in `.env.example`. MySQL passwords,
Mailgun keys, and the session secret must never be placed in a Vite `.env` file.

The single private server configuration is based on
`api/config.example.php`. Production mounts it read-only from:

```text
/home/ostech/oakboard-config.php
```

## Validation

```powershell
npm run php:check
npm run typecheck
npm run lint
npm run build -- --emptyOutDir
```

`npm run build` creates the frontend and PHP runtime in `dist/`. Docker performs
the same clean build inside its image, so host PHP and Node versions cannot
change the production result.

## Application routes

| URL | Purpose |
| --- | --- |
| `/` | Public product page |
| `/sign-in` | Sign in, signup, OTP, and recovery |
| `/workspace` | Authenticated dashboard |
| `/plans/new` | New-plan workflow |
| `/plans/archived` | Archived plans |
| `/plans/{id}` | Owner-scoped preview and export |
| `/plans/{id}/edit` | Owner-scoped plan editor |
| `/api/health` | Container, config, and database health |

## Production

Use [`DEPLOYMENT.md`](DEPLOYMENT.md) as the only production deployment guide.
It includes Docker setup, the cPanel subdomain-only proxy, updates, verification,
and rollback.

For a self-contained Team Lead or ChatGPT handoff, share
[`OakBoard-Team-Lead-Docker-Deployment-Handoff.pdf`](output/pdf/OakBoard-Team-Lead-Docker-Deployment-Handoff.pdf).
It summarizes the safe deployment sequence without relying on previous chat
history.

Database structure is documented in
[`database/mysql/README.md`](database/mysql/README.md).

## Security

- Every plan query is scoped to the authenticated owner.
- Passwords use PHP password hashing; raw passwords and session tokens are not
  stored.
- State-changing API requests require CSRF validation.
- The Docker port binds only to `127.0.0.1`; it is not publicly exposed.
- Production secrets remain outside Git and outside the public document root.
- Never bind the container to host ports `80` or `443`.
- Rotate credentials that were previously shared in chat, screenshots, or
  shell history.
