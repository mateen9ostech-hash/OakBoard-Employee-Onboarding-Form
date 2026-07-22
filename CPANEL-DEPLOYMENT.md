# OakBoard cPanel Deployment

OakBoard is a dynamic Next.js application. Uploading its source into a web document root is not enough; cPanel must run it as a Node.js application through Phusion Passenger.

## Supported runtime

- Node.js 22 is recommended on cPanel.
- Application type: Node.js
- Deployment environment: Production
- Startup file: `app.js`

Next.js 16 requires Node.js 20.9 or newer. The repository supports Node.js 20.9 through 24.x.

## Application Manager values

| Field | Value |
| --- | --- |
| Application name | `onboarding` |
| Deployment domain | `onboarding.9ostech.com` |
| Base application URL | `/` |
| Application type | Node.js |
| Deployment environment | Production |
| Startup file | `app.js` |

Prefer an application path outside `public_html`, for example `apps/oakboard`. This prevents source files and private local environment files from being served by Apache if Passenger is stopped or misconfigured.

## Environment variables

Configure these privately in cPanel Application Manager. Never commit their real values.

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://onboarding.9ostech.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
PLAN_DATABASE_BACKEND=supabase
```

Keep `PLAN_DATABASE_BACKEND=supabase` until the MySQL schema and data import have both succeeded. Then add the private `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and rotated `MYSQL_PASSWORD` values and switch the backend to `mysql`.

Supabase Authentication URL Configuration must include:

```text
https://onboarding.9ostech.com/auth/callback
```

## Build on cPanel

Run these commands as the cPanel account user from the application directory:

```bash
export PATH=/opt/cpanel/ea-nodejs22/bin:$PATH
node --version
npm --version
npm ci
npm run build
mkdir -p tmp
touch tmp/restart.txt
```

The build creates `.next/standalone/server.js`, copies `public` and `.next/static` into the standalone runtime, and leaves `app.js` as Passenger's stable entry point.

Do not upload a Windows `node_modules` directory. Always recreate dependencies on the Linux server with `npm ci`.

## Verification

Open these URLs after restarting the application:

```text
https://onboarding.9ostech.com/sign-in
https://onboarding.9ostech.com/help
```

An unauthenticated request to `/api/plans` should return HTTP 401. It should not return an Apache directory listing.

If the application fails, check the application `logs/` directory or `stderr.log` in cPanel before changing Apache or NGINX configuration.
