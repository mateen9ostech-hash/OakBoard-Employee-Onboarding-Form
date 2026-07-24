# OakBoard Project Workflow

## Git permission

- When Mateen says `push`, `push kardo`, `git mein push kardo`, or an equivalent clear instruction, treat it as explicit approval to review the current OakBoard changes, commit them, and push them to the existing `main` branch.
- Do not ask for a second Git approval after that instruction.
- Use a concise commit message that accurately describes the changes.
- Verify the branch, remote, commit result, and push result before reporting completion.

## Actions that still require separate approval

- Deleting or moving files.
- Force-pushing, rewriting Git history, or destructive Git operations.
- Deploying or publishing.
- Adding, exposing, or changing secrets.
- Using paid services.

## cPanel production safety

- OakBoard deployment changes must remain isolated to `onboarding.9ostech.com` and its own project, document-root, database, and configuration paths.
- Never change global Apache, Nginx, PHP, DNS, firewall, MySQL, cPanel, or WHM settings in a way that could affect existing websites.
- Never delete, overwrite, move, restart, or reconfigure another cPanel website, virtual host, database, application, service, or shared document root.
- Before any server-level or Docker change, verify that it is scoped to OakBoard. If isolation cannot be guaranteed, stop and request explicit confirmation instead of applying the change.
