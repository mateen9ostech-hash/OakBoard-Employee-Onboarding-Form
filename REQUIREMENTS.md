# OakBoard Requirements

## Development

- Node.js 20.19–24.x
- npm 10–11
- Git and a modern browser
- PHP 8.1+ for local API testing

Install the checked-in lockfile with `npm ci`.

## Production cPanel account

- Apache with `.htaccess`, `mod_rewrite`, and PHP
- PHP 8.1+ with PDO MySQL, cURL, mbstring, JSON, and OpenSSL
- MySQL 8.0+ or MariaDB 10.6+
- InnoDB, `utf8mb4`, and JSON support
- A database user restricted to the OakBoard database
- HTTPS for `onboarding.9ostech.com`

Production does not require Node.js, Passenger, Application Manager, PM2, systemd, or an Apache restart.

## Optional browser environment

```env
VITE_API_BASE_URL=/api
VITE_SITE_URL=https://onboarding.9ostech.com
```

These values are public. Never add MySQL, Mailgun, session, or SMTP secrets.

## Private PHP configuration

Create `/home/CPANEL_USER/oakboard-config.php` from `api/config.example.php`, keep it outside `public_html`, and set mode `600`. It contains:

- MySQL connection values
- a random session secret of at least 32 characters
- the allowed signup domain (`9ostech.com`)
- Mailgun API key, domain, region, sender, and reply-to address

MySQL stores users, sessions, one-time tokens, plans, and email logs. Mailgun sends signup OTPs, recovery codes, and PDF attachments.
