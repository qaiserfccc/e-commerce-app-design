const LEGACY_SSL_MODES = new Set(['prefer', 'require', 'verify-ca'])

/** @param {string} connectionString @returns {string} */
export function normalizePostgresConnectionString(connectionString) {
  if (typeof connectionString !== 'string' || !connectionString.trim()) {
    throw new Error('Database connection is not configured.')
  }

  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) return connectionString

  const url = new URL(connectionString)
  const sslMode = url.searchParams.get('sslmode')?.toLowerCase()
  if (sslMode && LEGACY_SSL_MODES.has(sslMode)) {
    url.searchParams.set('sslmode', 'verify-full')
  }
  return url.toString()
}
