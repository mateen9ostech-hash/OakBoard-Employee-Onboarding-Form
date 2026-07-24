# OakBoard

OakBoard is an internal employee-onboarding plan builder for approved
`@9ostech.com` users. It creates structured two-week and four-week plans,
stores each user's plans privately, and exports or emails polished PDFs.

Production: [onboarding.9ostech.com](https://onboarding.9ostech.com/)

## Architecture

```text
React + TypeScript + Vite
        |
same-origin PHP REST API
        |
cPanel MySQL + Mailgun
```

Production packages the React frontend and PHP API into one isolated Docker
container. The existing cPanel MySQL database remains external to Docker.

## Features

- Work-email signup with six-digit OTP verification
- Password authentication, recovery, remembered sessions, and CSRF protection
- User-owned plan history with edit, archive, restore, and delete actions
- Guided two-week and four-week onboarding workflows
- PDF preview, download, and Mailgun delivery
- Responsive workspace, help, privacy, and terms pages

## Local development

Requirements:

- Node.js 20.19–24.x and npm 10–11
- PHP 8.1+ for API testing
- Access to a private OakBoard server configuration

Install dependencies and start the frontend:

```powershell
npm ci
npm run dev
```

For full API testing, keep the PHP configuration outside the repository and
start the API in a second terminal:

```powershell
$env:OAKBOARD_CONFIG_FILE = "C:\private\oakboard-config.php"
npm run dev:api
```

Open [127.0.0.1:3000/sign-in](http://127.0.0.1:3000/sign-in). Vite proxies
same-origin `/api` requests to `127.0.0.1:8080`.

Windows users without administrator access can run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

## Configuration

- `.env.example` documents browser-public Vite settings.
- `.env.production` contains only the public production URL and API path.
- `api/config.example.php` documents the private server configuration.
- Production reads `/home/ostech/oakboard-config.php` as a read-only mount.

Never put MySQL passwords, Mailgun keys, or session secrets in a Vite
environment file or Git.

## Quality checks

```powershell
npm run typecheck
npm run lint
npm run php:check
npm run build -- --emptyOutDir
```

## Production deployment

[`DEPLOYMENT.md`](DEPLOYMENT.md) is the single production deployment guide. It
covers the OakBoard-only Docker container, cPanel subdomain proxy, validation,
updates, and rollback.

The server's private configuration, `.docker.env`, cPanel proxy include, and
MySQL data are outside Git. A normal `git pull` therefore updates source code
without overwriting production credentials or server settings.

Database requirements and first-time schema setup are documented in
[`database/mysql/README.md`](database/mysql/README.md).

## Repository layout

```text
api/              PHP authentication, plans, and Mailgun API
database/mysql/   MySQL schema and database notes
docker/           Container runtime and cPanel proxy templates
public/           Public static assets
scripts/          Validation, setup, and production-build helpers
src/              React application
```

## Security

- Every plan query is scoped to the authenticated owner.
- Passwords and session tokens are stored only as secure hashes.
- State-changing requests require CSRF validation.
- Production secrets remain outside Git and the public document root.
- The container listens only on `127.0.0.1`; cPanel owns public ports 80/443.
- Credentials exposed in chat, screenshots, or shell history must be rotated.
