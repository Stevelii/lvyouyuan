import mysql from 'mysql2/promise'

export const databaseName = 'lvyouyuan'

const sharedConfig = {
  host: process.env.MYSQL_HOST ?? '120.77.168.11',
  user: process.env.MYSQL_USER ?? 'root',
  password: process.env.MYSQL_PASSWORD ?? 'www.gblinker.c0m',
  port: Number(process.env.MYSQL_PORT ?? 6606),
  charset: process.env.MYSQL_CHARSET ?? 'utf8mb4',
  connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT ?? 5000)
}

let pool

export function createAdminConnection() {
  return mysql.createConnection({
    ...sharedConfig,
    multipleStatements: false
  })
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...sharedConfig,
      database: process.env.MYSQL_DATABASE ?? databaseName,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE ?? 12),
      queueLimit: 0,
      namedPlaceholders: true
    })
  }

  return pool
}

export async function query(sql, params) {
  const [rows] = await getPool().query(sql, params ?? [])
  return rows
}

export async function queryOne(sql, params) {
  const rows = await query(sql, params)
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

export async function execute(sql, params) {
  if (!params || (Array.isArray(params) && params.length === 0)) {
    const [result] = await getPool().query(sql)
    return result
  }

  const [result] = await getPool().execute(sql, params)
  return result
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
