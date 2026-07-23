# OakBoard cPanel Update Guide

Use this guide for the `migration/react-php-mysql` branch. The deployment is scoped to `/home/ostech/public_html/onboarding.9ostech.com` and does not change Apache, Passenger, PHP settings, or another website.

## Pull and deploy from cPanel

1. Sign in to cPanel.
2. Open **Files > Git Version Control**.
3. Find the OakBoard repository and click **Manage**.
4. Confirm **Checked-Out Branch** is `migration/react-php-mysql`.
5. Open the **Pull or Deploy** tab.
6. Click **Update from Remote** and wait for the success message.
7. Confirm the HEAD commit shown by cPanel matches the latest migration commit.
8. Click **Deploy HEAD Commit** and wait for all tasks to finish.
9. Open `https://onboarding.9ostech.com/sign-in` in a private window and confirm the login form appears without the Setup Required message.

The deployment automatically installs the locked dependencies with cPanel Node.js 22, runs TypeScript validation, builds the Vite application with the committed public production configuration, and copies only `dist/` into the OakBoard subdomain document root.

## One-time private server setup

The following cannot be stored in Git and must exist before authenticated plan CRUD works:

- `/home/ostech/oakboard-config.php` created from `api/config.example.php`, mode `600`.
- MySQL credentials limited to the OakBoard database.
- `database/mysql/schema.sql` imported into that database.
- A random session secret and the Mailgun settings added to the private config.

Never place MySQL, Mailgun, session, or SMTP secrets in `.env.production` or the public document root.

## If deployment is disabled or fails

- Deployment requires a clean cPanel repository and the checked-in `.cpanel.yml` file.
- Review the cPanel deployment log shown in Git Version Control.
- The server log is under `/home/ostech/.cpanel/logs/` with a `git_deploy` filename.
- Do not run an Apache rebuild/restart or modify another domain to fix OakBoard.
