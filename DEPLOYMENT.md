# OakBoard Docker Production Deployment

This is the only production deployment guide for OakBoard.

```text
Repository: mateen9ostech-hash/OakBoard-Employee-Onboarding-Form
Branch: main
Domain: https://onboarding.9ostech.com
Recommended checkout: /home/ostech/apps/oakboard
Private config: /home/ostech/oakboard-config.php
Container listener: 127.0.0.1:8180
Database: existing external cPanel MySQL
```

## Safety boundary

OakBoard must remain isolated from every existing cPanel website.

Do not:

- publish the container on host port `80` or `443`;
- replace, stop, or reconfigure the existing cPanel Apache service;
- add proxy rules to a global include or another virtual host;
- run `docker system prune`, remove shared Docker networks, or delete volumes;
- create a replacement MySQL container or change global MySQL settings;
- edit another website, DNS zone, document root, database, or PHP version.

The Compose file publishes OakBoard only on `127.0.0.1:8180`. The public domain
reaches it through a reverse proxy scoped only to the
`onboarding.9ostech.com` SSL virtual host.

## 1. Confirm server support

Run:

```bash
docker --version
docker compose version
apachectl -M | grep -E 'proxy_module|proxy_http_module|headers_module'
```

Required:

- Docker Engine 24+;
- Docker Compose v2;
- Apache `proxy`, `proxy_http`, and `headers` modules;
- outbound access to the existing MySQL host and Mailgun.

Stop if Docker is unavailable. Do not install or enable server-wide packages
without confirming their impact with the server administrator.

## 2. Prepare the project and private config

Clone outside `public_html`:

```bash
mkdir -p /home/ostech/apps
cd /home/ostech/apps
git clone https://github.com/mateen9ostech-hash/OakBoard-Employee-Onboarding-Form.git oakboard
cd oakboard
git switch main
```

Create `/home/ostech/oakboard-config.php` from `api/config.example.php`. Add the
real MySQL, Mailgun, application, and session values privately.

```bash
chmod 600 /home/ostech/oakboard-config.php
chown ostech:ostech /home/ostech/oakboard-config.php
```

The application values must include:

```php
'app' => [
    'url' => 'https://onboarding.9ostech.com',
    'allowed_email_domain' => '9ostech.com',
],
```

Inside Docker, `localhost` means the OakBoard container itself. If MySQL runs on
the same cPanel server, use a database hostname/address reachable from the
container (the Compose file provides `host.docker.internal` as the Docker-host
alias). Do not change the global MySQL listener or grants without the server
administrator. The preflight will identify an unreachable database before
public traffic is switched.

Import `database/mysql/schema.sql` once if the required tables do not already
exist. Back up the OakBoard database before any future schema migration.

Create the non-secret Compose settings:

```bash
cp docker/compose.env.example .docker.env
chmod 600 .docker.env
```

`.docker.env` controls only the localhost port, config path, image tag, and
release label. Secrets remain in `/home/ostech/oakboard-config.php`.

## 3. Build and start without public traffic

```bash
cd /home/ostech/apps/oakboard
export OAKBOARD_RELEASE="$(git rev-parse --short HEAD)"
export OAKBOARD_IMAGE_TAG="${OAKBOARD_RELEASE}"

docker compose --env-file .docker.env config
docker compose --env-file .docker.env build --pull app
docker compose --env-file .docker.env up -d app
docker compose --env-file .docker.env ps
docker compose --env-file .docker.env logs --tail=100 app
```

The container runs a preflight before Apache starts. It refuses to start when:

- the private config is missing or invalid;
- required PHP extensions are missing;
- MySQL cannot be reached;
- required OakBoard tables are missing;
- Mailgun or session configuration is incomplete.

Verify locally on the server:

```bash
curl --fail --show-error http://127.0.0.1:8180/api/health
curl -I http://127.0.0.1:8180/sign-in
```

Expected health response:

```json
{"status":"ok","release":"<git-commit>"}
```

Do not change public routing until both checks pass.

## 4. Connect only the OakBoard subdomain

Use the hosting provider's supported **per-domain SSL virtual-host include** for
`onboarding.9ostech.com`. Use `docker/cpanel-proxy.conf.example` as the include
content.

Never add that file to:

- a global Apache include;
- the parent `9ostech.com` virtual host;
- another subdomain;
- ports or virtual hosts belonging to another website.

Before applying the include:

1. back up the current OakBoard subdomain virtual-host configuration;
2. confirm the include belongs only to `onboarding.9ostech.com`;
3. run `apachectl configtest`;
4. use a graceful Apache reload through the cPanel/WHM-supported command;
5. immediately test existing websites and OakBoard.

The proxy must preserve the host and send:

```text
X-Forwarded-Proto: https
```

This keeps OakBoard session cookies secure behind TLS termination.

## 5. Production verification

```bash
curl -I https://onboarding.9ostech.com/sign-in
curl --fail --show-error https://onboarding.9ostech.com/api/health
curl -I https://onboarding.9ostech.com/oakboard-email-logo.png
```

Then test:

- signup and six-digit OTP email;
- sign in, password recovery, remember-me, and sign out;
- strict plan isolation using two users;
- create, edit, preview, archive, restore, and permanent delete;
- two-week and four-week PDF download;
- PDF email attachment and visible email logo;
- refreshed deep links and mobile layout.

Also open at least one existing cPanel website and confirm it is unchanged.

## 6. Future deployments

```bash
cd /home/ostech/apps/oakboard
git status --short
git pull --ff-only origin main

export OAKBOARD_RELEASE="$(git rev-parse --short HEAD)"
export OAKBOARD_IMAGE_TAG="${OAKBOARD_RELEASE}"

docker compose --env-file .docker.env build --pull app
docker compose --env-file .docker.env up -d app
docker compose --env-file .docker.env ps
curl --fail --show-error http://127.0.0.1:8180/api/health
```

The private config and external MySQL data are not rebuilt or overwritten.

## 7. Rollback

List retained images:

```bash
docker image ls oakboard
```

Start a previous image without rebuilding:

```bash
export OAKBOARD_IMAGE_TAG="<previous-commit-tag>"
export OAKBOARD_RELEASE="<previous-commit-tag>"
docker compose --env-file .docker.env up -d --no-build app
curl --fail --show-error http://127.0.0.1:8180/api/health
```

If the container itself must be removed:

```bash
docker compose --env-file .docker.env down
```

This command is scoped to the `oakboard` Compose project. Do not add `-v` and do
not run a system-wide prune.

If the reverse proxy must be rolled back, restore only the previous
`onboarding.9ostech.com` per-domain include, validate Apache configuration, and
perform a graceful reload. Do not touch another virtual host.

## Troubleshooting

```bash
docker compose --env-file .docker.env ps
docker compose --env-file .docker.env logs --tail=200 app
docker inspect --format='{{json .State.Health}}' oakboard-app
curl -v http://127.0.0.1:8180/api/health
```

- **Container exits immediately:** read the preflight error in the logs.
- **Health returns 500:** verify MySQL connectivity and the mounted private
  config.
- **Local health works but public URL fails:** check only the OakBoard
  subdomain proxy include.
- **OTP/PDF email fails:** check Mailgun Events and the configured sender
  domain.
- **Existing website changes:** stop the cutover and restore the previous
  OakBoard-only proxy include. Do not troubleshoot by changing global services.
