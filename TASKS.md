# OakBoard Project Task List

Last updated: 2026-07-15

This file is the live checklist for OakBoard. After each completed task, update the relevant checkbox and add any important notes.

## Completed

- [x] Merge recovered OakBoard UI/functionality into the canonical project baseline.
- [x] Shift current OakBoard project into the active workspace path.
- [x] Rename/normalize project folder to `OakBoard-Employee-Onboarding-Form`.
- [x] Clean old duplicate OakBoard project copies from the local workspace.
- [x] Fix major `Verifying session...` loop issues in the static app auth guard.
- [x] Reduce local session lifetime from 15 minutes to 2 minutes.
- [x] Preserve existing static app flow: Login -> Fill Details -> Generate Form.
- [x] Add local Supabase SDK bundle usage for safer static-app auth loading.
- [x] Add Supabase migration for onboarding plans/imports/email logs.
- [x] Add `parse-onboarding-plan` Supabase Edge Function.
- [x] Add `send-onboarding-email` Supabase Edge Function.
- [x] Add demo-mode email behavior for Resend testing restrictions.
- [x] Add root `.env.example` with Supabase, Ollama, and Resend placeholders.
- [x] Install Node.js locally for the project workflow.
- [x] Scaffold React + TypeScript + Vite app in `react-app/`.
- [x] Install React dependencies including Supabase JS and React Router.
- [x] Verify React scaffold production build.
- [x] Replace Vite demo with initial OakBoard React app shell.
- [x] Add React routes for `/login`, `/fill-details`, and `/generate-form`.
- [x] Add React Supabase client setup.
- [x] Add React auth/session guard with 2-minute session freshness.
- [x] Add React plan storage helpers compatible with `obf_plan_data`.
- [x] Add placeholder React Login, Fill Details, and Generate Form pages.
- [x] Add `react-app/.env.example` for Vite Supabase variables.
- [x] Verify React app builds after routing/auth foundation.
- [x] Create this live project task list.
- [x] Add workspace-level project index and VS Code workspace entries so OakBoard GitHub repo is discoverable after a fresh VS Code/Codex setup.

## In progress

- [ ] React migration from static HTML app to full production React app.

## Pending

### React migration

- [x] Migrate the real `Login.html` UI and behavior into React.
- [x] Migrate the real `FillDetails.html` UI into React.
- [x] Migrate the Import with AI modal into React.
- [x] Connect React Import with AI flow to `parse-onboarding-plan`.
- [x] Migrate the real `GenerateForm.html` preview into React.
- [x] Preserve 16:9 / landscape print-preview layout in React.
- [x] Preserve exact day-card sizing rules in React:
  - 360 x 306 day cards.
  - 14px border radius.
  - 16px padding.
  - 12px minimum text size.
  - 4px vertical spacing where requested.
- [x] Preserve week/day frame layout rules:
  - 5 day cards per frame.
  - frame width 1848px.
  - frame height 306px.
  - 12px gap.
  - 36px side padding.
  - 9px top/bottom spacing.
- [ ] Preserve `ph`, `pw`, and `pd` merged wrapper layout rules:
  - centered alignment.
  - 1848px width.
  - 10px margin between divs.
- [x] Enforce day content limits in React:
  - day title max 90 characters.
  - each task max 90 characters.
  - outcome max 90 characters.
  - allow 5-6 tasks only when shorter text allows it.
- [x] Use correct icons in React:
  - `DayTitleIcon` at 16 x 16px.
  - `DayTasksIcon` at 16 x 16px.
  - `DayOutcomeIcon` at 16 x 16px.
  - replace task icon with `Assets/Task icon.svg`.
- [x] Use the correct logo assets and proportions in React preview/PDF/email.
- [x] Ensure 2-week plans generate only 10 days on 1 page.
- [x] Ensure 4-week plans generate 20 days across 2 pages.

### PDF and email output

- [ ] Rebuild PDF generation in React so it matches the preview better.
- [ ] Ensure browser print does not show date/title/path/page-number headers when using app PDF export.
- [ ] Keep email output landscape-style and visually aligned with the preview.
- [ ] Attach/generated email document should match the onboarding-form reference style.
- [ ] Keep Resend secrets server-side only.
- [ ] Keep demo mode for unverified Resend domain restrictions.

### Backend and AI parser

- [ ] Configure Supabase Edge Function secrets for AI provider.
- [ ] Configure `AI_PROVIDER=ollama` when ready.
- [ ] Add/verify Ollama API key in Supabase secrets, not frontend code.
- [ ] Improve parser so grouped day ranges do not duplicate same data across all days.
- [ ] Add parser validation for 2-week vs 4-week plan duration.
- [ ] Save parsed/imported plans into Supabase Postgres.
- [ ] Add import history or reusable saved plans if required.

### Deployment and workflow

- [x] Add Vercel configuration for React deployment if needed.
- [x] Add Vercel environment variable instructions.
- [ ] Decide final deployment target for React app.
- [x] Test production build locally before every deploy.
- [x] Push current React migration changes after user says `push`.
- [ ] Deploy only after explicit user approval.

### Cleanup

- [ ] Remove unused Vite starter assets if no longer needed.
- [ ] Remove or archive old static HTML files only after React app fully replaces them and user approves.
- [ ] Keep project folder clean and avoid duplicate OakBoard copies.
