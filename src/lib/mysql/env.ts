import 'server-only'

const backend = process.env.PLAN_DATABASE_BACKEND?.trim().toLowerCase() || 'supabase'

export const planDatabaseBackend = backend === 'mysql' ? 'mysql' : 'supabase'

export function getMySqlEnv() {
  const host = process.env.MYSQL_HOST?.trim()
  const port = Number(process.env.MYSQL_PORT || 3306)
  const database = process.env.MYSQL_DATABASE?.trim()
  const user = process.env.MYSQL_USER?.trim()
  const password = process.env.MYSQL_PASSWORD

  if (!host || !database || !user || !password || !Number.isInteger(port) || port <= 0) {
    throw new Error('MySQL is selected but its server-only environment variables are incomplete.')
  }

  return { host, port, database, user, password }
}
