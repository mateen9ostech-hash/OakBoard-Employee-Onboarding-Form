import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const databaseUrl = process.env.SUPABASE_DB_URL?.trim()

if (!databaseUrl) {
  throw new Error('SUPABASE_DB_URL is missing. Add it privately to .env.local and retry.')
}

const outputDirectory = path.resolve('database/mysql/private')
const outputFile = path.join(outputDirectory, 'oakboard-postgres-export.json')
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()

  const [users, imports, plans, emailLogs] = await Promise.all([
    client.query(`
      SELECT
        id::text AS id,
        lower(email) AS email,
        COALESCE(
          raw_user_meta_data->>'full_name',
          raw_user_meta_data->>'name',
          raw_user_meta_data->>'display_name',
          ''
        ) AS full_name,
        email_confirmed_at,
        created_at,
        updated_at
      FROM auth.users
      WHERE email IS NOT NULL
      ORDER BY created_at ASC
    `),
    client.query(`
      SELECT
        id::text AS id,
        owner_id::text AS owner_id,
        source_type,
        source_filename,
        raw_text,
        parser_provider,
        parser_model,
        preferred_weeks,
        parsed_json,
        status,
        error_message,
        created_at,
        updated_at
      FROM public.onboarding_imports
      ORDER BY created_at ASC
    `),
    client.query(`
      SELECT
        id::text AS id,
        owner_id::text AS owner_id,
        title,
        role,
        reports_to,
        collaborates_with,
        duration_weeks,
        plan_json,
        source_import_id::text AS source_import_id,
        archived_at,
        created_at,
        updated_at
      FROM public.onboarding_plans
      ORDER BY created_at ASC
    `),
    client.query(`
      SELECT
        id::text AS id,
        owner_id::text AS owner_id,
        plan_id::text AS plan_id,
        recipient_email,
        cc_email,
        provider,
        provider_message_id,
        status,
        error_message,
        created_at
      FROM public.onboarding_email_logs
      ORDER BY created_at ASC
    `),
  ])

  const exportDocument = {
    format: 'oakboard-postgres-export-v1',
    exportedAt: new Date().toISOString(),
    security: 'Password hashes, OTP records, refresh tokens, and sessions are intentionally excluded.',
    users: users.rows,
    onboardingImports: imports.rows,
    onboardingPlans: plans.rows,
    onboardingEmailLogs: emailLogs.rows,
  }

  await mkdir(outputDirectory, { recursive: true })
  await writeFile(outputFile, `${JSON.stringify(exportDocument, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })

  console.log(`Private export created: ${outputFile}`)
  console.log(`Users: ${users.rowCount ?? 0}`)
  console.log(`Imports: ${imports.rowCount ?? 0}`)
  console.log(`Plans: ${plans.rowCount ?? 0}`)
  console.log(`Email logs: ${emailLogs.rowCount ?? 0}`)
} finally {
  await client.end().catch(() => undefined)
}
