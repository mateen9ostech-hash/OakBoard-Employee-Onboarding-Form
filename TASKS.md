# React/PHP/MySQL Migration Status

Last updated: 2026-07-23

## Implemented on `migration/react-php-mysql`

- [x] Isolated migration branch created from clean `main`.
- [x] Vite + React Router SPA entry and professional route structure added.
- [x] Active screens moved from framework route-group folders into native `src/pages` modules.
- [x] Existing branded login, workspace, builder, preview, PDF, and public pages retained.
- [x] MySQL-native signup, OTP verification, sign-in, recovery, and sessions added.
- [x] Protected-route behavior implemented client-side.
- [x] PHP 8 JSON API added with PDO prepared statements.
- [x] HTTP-only sessions, CSRF validation, password hashing, and lockout added.
- [x] Mailgun signup, recovery, and PDF-attachment delivery added.
- [x] Owner-scoped list/create/read/update/archive/restore/delete implemented.
- [x] Static cPanel `.htaccess` route fallback and API routing added.
- [x] Production build copies the required PHP runtime files into `dist/api`.
- [x] Previous server runtime code removed from the migration branch.
- [x] TypeScript, ESLint, Vite build, and npm audit pass locally.
- [x] Portable PHP 8.4 installed for local syntax checks.

## Release gates

- [ ] Run PHP syntax checks on cPanel PHP 8.1+.
- [ ] Import `database/mysql/schema.sql` into the target database.
- [ ] Create private `/home/ostech/oakboard-config.php` with rotated credentials.
- [ ] Test login, signup OTP, and recovery on the migration domain.
- [ ] Test two separate users for strict plan isolation.
- [ ] Test create, edit, preview, archive, restore, and permanent delete.
- [ ] Test NotebookLM import and error handling.
- [ ] Test two-week/four-week PDF download and authenticated email attachment.
- [ ] Test desktop and mobile layouts in production.
- [ ] Merge only after written acceptance; keep `main` rollback available.
