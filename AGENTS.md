# OST Workforce Onboarding Project Workflow

## Git permission

- When Mateen says `push`, `push kardo`, `git mein push kardo`, or an equivalent clear instruction, treat it as explicit approval to review the current OST Workforce Onboarding changes, commit them, and push them to the existing `main` branch.
- Do not ask for a second Git approval after that instruction.
- Use a concise commit message that accurately describes the changes.
- Verify the branch, remote, commit result, and push result before reporting completion.

## Actions that still require separate approval

- Deleting or moving files.
- Force-pushing, rewriting Git history, or destructive Git operations.
- Deploying or publishing.
- Adding, exposing, or changing secrets.
- Using paid services.

## Onboarding schedule rule

- Use `api/holiday-calendar.json` as the source of truth for company holidays.
- No onboarding day may fall on Saturday, Sunday, or a configured holiday.
- Tentative lunar holidays stay blocked until the official calendar is updated.
- Before reporting a scheduling change complete, verify frontend and PHP output
  for a date range that crosses at least one configured holiday.
