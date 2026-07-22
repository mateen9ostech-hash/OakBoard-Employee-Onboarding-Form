import { readFile } from 'node:fs/promises'
import path from 'node:path'
import mysql from 'mysql2/promise'

const requiredVariables = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD']
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim())
if (missingVariables.length > 0) {
  throw new Error(`Missing MySQL environment variables: ${missingVariables.join(', ')}`)
}

const exportFile = path.resolve('database/mysql/private/oakboard-postgres-export.json')
const exportDocument = JSON.parse(await readFile(exportFile, 'utf8'))
if (exportDocument.format !== 'oakboard-postgres-export-v1') {
  throw new Error('Unsupported or invalid OakBoard export file.')
}

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  charset: 'utf8mb4',
  timezone: 'Z',
})

const toJson = (value) => value == null ? null : JSON.stringify(value)

try {
  await connection.beginTransaction()

  for (const user of exportDocument.users) {
    await connection.execute(
      `INSERT INTO app_users
       (id, email, full_name, password_hash, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         full_name = VALUES(full_name),
         email_verified_at = VALUES(email_verified_at),
         updated_at = VALUES(updated_at)`,
      [user.id, user.email, user.full_name || '', user.email_confirmed_at, user.created_at, user.updated_at],
    )
  }

  for (const item of exportDocument.onboardingImports) {
    await connection.execute(
      `INSERT INTO onboarding_imports
       (id, owner_id, source_type, source_filename, raw_text, parser_provider, parser_model,
        preferred_weeks, parsed_json, status, error_message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         source_filename = VALUES(source_filename), raw_text = VALUES(raw_text),
         parser_provider = VALUES(parser_provider), parser_model = VALUES(parser_model),
         preferred_weeks = VALUES(preferred_weeks), parsed_json = VALUES(parsed_json),
         status = VALUES(status), error_message = VALUES(error_message), updated_at = VALUES(updated_at)`,
      [
        item.id, item.owner_id, item.source_type, item.source_filename, item.raw_text,
        item.parser_provider, item.parser_model, item.preferred_weeks, toJson(item.parsed_json),
        item.status, item.error_message, item.created_at, item.updated_at,
      ],
    )
  }

  for (const plan of exportDocument.onboardingPlans) {
    await connection.execute(
      `INSERT INTO onboarding_plans
       (id, owner_id, title, role, reports_to, collaborates_with, duration_weeks,
        plan_json, source_import_id, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title), role = VALUES(role), reports_to = VALUES(reports_to),
         collaborates_with = VALUES(collaborates_with), duration_weeks = VALUES(duration_weeks),
         plan_json = VALUES(plan_json), source_import_id = VALUES(source_import_id),
         archived_at = VALUES(archived_at), updated_at = VALUES(updated_at)`,
      [
        plan.id, plan.owner_id, plan.title, plan.role, plan.reports_to, plan.collaborates_with,
        plan.duration_weeks, toJson(plan.plan_json), plan.source_import_id, plan.archived_at,
        plan.created_at, plan.updated_at,
      ],
    )
  }

  for (const log of exportDocument.onboardingEmailLogs) {
    await connection.execute(
      `INSERT INTO onboarding_email_logs
       (id, owner_id, plan_id, recipient_email, cc_email, provider, provider_message_id,
        status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         recipient_email = VALUES(recipient_email), cc_email = VALUES(cc_email),
         provider = VALUES(provider), provider_message_id = VALUES(provider_message_id),
         status = VALUES(status), error_message = VALUES(error_message)`,
      [
        log.id, log.owner_id, log.plan_id, log.recipient_email, log.cc_email, log.provider,
        log.provider_message_id, log.status, log.error_message, log.created_at,
      ],
    )
  }

  await connection.commit()
  console.log(`Users imported: ${exportDocument.users.length}`)
  console.log(`Imports imported: ${exportDocument.onboardingImports.length}`)
  console.log(`Plans imported: ${exportDocument.onboardingPlans.length}`)
  console.log(`Email logs imported: ${exportDocument.onboardingEmailLogs.length}`)
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  await connection.end()
}
