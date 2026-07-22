import 'server-only'

import mysql, { type Pool } from 'mysql2/promise'
import { getMySqlEnv } from './env'

declare global {
  var oakBoardMySqlPool: Pool | undefined
}

export function getMySqlPool() {
  if (!globalThis.oakBoardMySqlPool) {
    const config = getMySqlEnv()
    globalThis.oakBoardMySqlPool = mysql.createPool({
      ...config,
      charset: 'utf8mb4',
      connectionLimit: 8,
      decimalNumbers: true,
      enableKeepAlive: true,
      namedPlaceholders: false,
      timezone: 'Z',
    })
  }

  return globalThis.oakBoardMySqlPool
}
