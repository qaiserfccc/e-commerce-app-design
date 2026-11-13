'use client'

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  FileArchive,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'

const API_PATH = '/api/admin/site-backup'
const MAGIC = 'ISK-LENSES-BACKUP-1'
const FORMAT_VERSION = 1
const SCHEMA_VERSION = 29
const PBKDF2_ITERATIONS = 310_000
const ENCRYPTED_CHUNK_BYTES = 1024 * 1024
const MEDIA_CHUNK_BYTES = 512 * 1024
const JSON_UPLOAD_LIMIT = 1_500_000
const MAX_UPLOAD_ROWS = 100
const MAX_ARCHIVE_LINE_CHARS = 20_000_000
const RESTORE_CONFIRMATION = 'RESTORE ALL STORE DATA'
const EXPECTED_TABLES = [
  'store_categories',
  'store_brands',
  'store_lens_shades',
  'store_lens_types',
  'store_products',
  'store_product_viewers',
  'store_product_categories',
  'store_product_reviews',
  'store_product_relations',
  'store_customers',
  'store_orders',
  'store_order_items',
  'store_product_assets',
  'store_product_variants',
  'store_activity_events',
  'store_growth_events',
  'store_error_logs',
  'store_banners',
  'store_media_objects',
  'store_reviews',
  'store_settings',
  'store_crm_leads',
] as const

type BackupTable = (typeof EXPECTED_TABLES)[number]
type ManifestEntry = { name: BackupTable; rowCount: number }
type BackupStatus = {
  ready: boolean
  requiredMigration: string | null
  formatVersion: number
  schemaVersion: number
  tables: number
  mediaChunkBytes: number
}
type BackupRecord = {
  table: BackupTable
  index: number
  data: Record<string, unknown>
  mediaBase64?: string
}
type ArchiveHeader = {
  formatVersion: number
  schemaVersion: number
  createdAt: string
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  salt: string
  noncePrefix: string
  manifest: ManifestEntry[]
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The backup request could not be completed.'
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(value: string) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('The backup encryption header is invalid.')
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
}

function concatenateBytes(left: Uint8Array, right: Uint8Array) {
  const result = new Uint8Array(left.length + right.length)
  result.set(left)
  result.set(right, left.length)
  return result
}

function encodeFrameLength(length: number) {
  const result = new Uint8Array(4)
  new DataView(result.buffer).setUint32(0, length, false)
  return result
}

function frameNonce(prefix: Uint8Array, index: number) {
  if (prefix.length !== 8 || index >= 0xffffffff) throw new Error('The backup contains too many encryption chunks.')
  const nonce = new Uint8Array(12)
  nonce.set(prefix)
  new DataView(nonce.buffer).setUint32(8, index, false)
  return nonce
}

function frameAdditionalData(header: Uint8Array, index: number) {
  return concatenateBytes(header, encodeFrameLength(index))
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const pieceSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += pieceSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + pieceSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function readApiData<T>(response: Response) {
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = isRecord(result) && typeof result.error === 'string'
      ? result.error
      : `The request failed (${response.status}).`
    throw new Error(message)
  }
  if (!isRecord(result) || !('data' in result)) throw new Error('The server returned an invalid backup response.')
  return result.data as T
}

async function postJson<T>(body: Record<string, unknown>) {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readApiData<T>(response)
}

async function readStatus() {
  const response = await fetch(`${API_PATH}?action=status`, { cache: 'no-store' })
  return readApiData<BackupStatus>(response)
}

async function readExportPage(jobId: string, table: BackupTable, offset: number) {
  const query = new URLSearchParams({ action: 'export-page', jobId, table, offset: String(offset) })
  const response = await fetch(`${API_PATH}?${query}`, { cache: 'no-store' })
  return readApiData<{ rows: Array<{ row_index: number | string; row_data: Record<string, unknown> }>; nextOffset: number; total: number }>(response)
}

async function readMediaChunk(jobId: string, pathname: string, offset: number) {
  const query = new URLSearchParams({ action: 'export-media', jobId, pathname, offset: String(offset) })
  const response = await fetch(`${API_PATH}?${query}`, { cache: 'no-store' })
  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(isRecord(result) && typeof result.error === 'string' ? result.error : 'A media file could not be read.')
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length || bytes.length > MEDIA_CHUNK_BYTES) throw new Error('The server returned an invalid media chunk.')
  return bytes
}

async function* readExportRecords(
  jobId: string,
  manifest: ManifestEntry[],
  onProgress: (rows: number, mediaBytes: number) => void,
): AsyncGenerator<BackupRecord> {
  let completedRows = 0
  let mediaBytes = 0
  for (const entry of manifest) {
    let offset = 0
    while (offset < entry.rowCount) {
      const page = await readExportPage(jobId, entry.name, offset)
      if (!page.rows.length || page.nextOffset <= offset || page.total !== entry.rowCount) {
        throw new Error(`The ${entry.name} export page was incomplete. Start a new backup.`)
      }
      for (const row of page.rows) {
        const index = Number(row.row_index)
        if (!Number.isSafeInteger(index) || index !== offset) throw new Error(`The ${entry.name} export is out of order.`)
        const data = row.row_data
        if (!isRecord(data)) throw new Error(`A ${entry.name} row is invalid.`)
        if (entry.name !== 'store_media_objects') {
          completedRows += 1
          onProgress(completedRows, mediaBytes)
          yield { table: entry.name, index, data }
          continue
        }

        const pathname = data.pathname
        const byteLength = data.byte_length
        if (typeof pathname !== 'string' || !Number.isSafeInteger(byteLength) || (byteLength as number) < 0) {
          throw new Error('A media object has invalid backup metadata.')
        }
        const content = new Uint8Array(byteLength as number)
        for (let mediaOffset = 0; mediaOffset < content.length; mediaOffset += MEDIA_CHUNK_BYTES) {
          const part = await readMediaChunk(jobId, pathname, mediaOffset)
          if (part.length > content.length - mediaOffset) throw new Error(`Media length mismatch for ${pathname}.`)
          content.set(part, mediaOffset)
          mediaBytes += part.length
          onProgress(completedRows, mediaBytes)
        }
        completedRows += 1
        onProgress(completedRows, mediaBytes)
        yield { table: entry.name, index, data, mediaBase64: bytesToBase64(content) }
      }
      offset = page.nextOffset
    }
  }
}

function createRecordStream(
  jobId: string,
  manifest: ManifestEntry[],
  onProgress: (rows: number, mediaBytes: number) => void,
) {
  const records = readExportRecords(jobId, manifest, onProgress)
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await records.next()
        if (next.done) controller.close()
        else controller.enqueue(encoder.encode(`${JSON.stringify(next.value)}\n`))
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await records.return(undefined)
    },
  })
}

async function cancelJob(jobId: string) {
  await postJson({ action: 'cancel', jobId })
}

async function encryptArchive(
  jobId: string,
  manifest: ManifestEntry[],
  passphrase: string,
  onProgress: (rows: number, mediaBytes: number) => void,
) {
  if (!('CompressionStream' in globalThis) || !('DecompressionStream' in globalThis)) {
    throw new Error('This browser does not support encrypted backups. Use a current version of Chrome, Edge, Firefox, or Safari.')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const noncePrefix = crypto.getRandomValues(new Uint8Array(8))
  const header: ArchiveHeader = {
    formatVersion: FORMAT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToHex(salt),
    noncePrefix: bytesToHex(noncePrefix),
    manifest,
  }
  const authenticatedHeader = encoder.encode(`${MAGIC}\n${JSON.stringify(header)}\n`)
  const key = await deriveEncryptionKey(passphrase, salt)
  const compressedReader = createRecordStream(jobId, manifest, onProgress)
    .pipeThrough(new CompressionStream('gzip'))
    .getReader()
  const parts: BlobPart[] = [authenticatedHeader]
  let pending = new Uint8Array(0)
  let chunkIndex = 0
  try {
    while (true) {
      const { done, value } = await compressedReader.read()
      if (done) break
      pending = concatenateBytes(pending, value)
      while (pending.length >= ENCRYPTED_CHUNK_BYTES) {
        const plaintext = pending.slice(0, ENCRYPTED_CHUNK_BYTES)
        pending = pending.slice(ENCRYPTED_CHUNK_BYTES)
        const encrypted = await crypto.subtle.encrypt({
          name: 'AES-GCM',
          iv: frameNonce(noncePrefix, chunkIndex),
          additionalData: frameAdditionalData(authenticatedHeader, chunkIndex),
        }, key, plaintext)
        const encryptedBytes = new Uint8Array(encrypted)
        parts.push(encodeFrameLength(encryptedBytes.length), encryptedBytes)
        chunkIndex += 1
      }
    }
    if (pending.length) {
      const encrypted = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv: frameNonce(noncePrefix, chunkIndex),
        additionalData: frameAdditionalData(authenticatedHeader, chunkIndex),
      }, key, pending)
      const encryptedBytes = new Uint8Array(encrypted)
      parts.push(encodeFrameLength(encryptedBytes.length), encryptedBytes)
    }
    parts.push(encodeFrameLength(0))
    return new Blob(parts, { type: 'application/octet-stream' })
  } finally {
    await compressedReader.cancel().catch(() => undefined)
    compressedReader.releaseLock()
  }
}

function validateManifest(value: unknown): value is ManifestEntry[] {
  if (!Array.isArray(value) || value.length !== EXPECTED_TABLES.length) return false
  let rows = 0
  return value.every((entry, index) => {
    if (!isRecord(entry) || entry.name !== EXPECTED_TABLES[index] ||
      !Number.isSafeInteger(entry.rowCount) || (entry.rowCount as number) < 0 || (entry.rowCount as number) > 1_000_000) {
      return false
    }
    rows += entry.rowCount as number
    return rows <= 2_000_000
  })
}

async function parseArchiveHeader(file: File, passphrase: string) {
  const headerBytes = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
  const firstLineEnd = headerBytes.indexOf(10)
  const secondLineEnd = firstLineEnd < 0 ? -1 : headerBytes.indexOf(10, firstLineEnd + 1)
  if (firstLineEnd < 0 || secondLineEnd < 0 ||
    decoder.decode(headerBytes.slice(0, firstLineEnd)) !== MAGIC) {
    throw new Error('This is not an ISK Lenses backup file.')
  }
  let header: unknown
  try {
    header = JSON.parse(decoder.decode(headerBytes.slice(firstLineEnd + 1, secondLineEnd)))
  } catch {
    throw new Error('The backup header is damaged.')
  }
  if (!isRecord(header) || header.formatVersion !== FORMAT_VERSION || header.schemaVersion !== SCHEMA_VERSION ||
    header.kdf !== 'PBKDF2-SHA-256' || header.iterations !== PBKDF2_ITERATIONS ||
    typeof header.salt !== 'string' || typeof header.noncePrefix !== 'string' ||
    typeof header.createdAt !== 'string' || !validateManifest(header.manifest)) {
    throw new Error(`This backup is not compatible with format ${FORMAT_VERSION} and database schema ${SCHEMA_VERSION}.`)
  }
  const salt = hexToBytes(header.salt)
  const noncePrefix = hexToBytes(header.noncePrefix)
  if (salt.length !== 16 || noncePrefix.length !== 8 || file.size <= secondLineEnd + 1) {
    throw new Error('The backup file is incomplete or has an invalid encryption header.')
  }
  const authenticatedHeader = headerBytes.slice(0, secondLineEnd + 1)
  const key = await deriveEncryptionKey(passphrase, salt)
  return {
    header: header as unknown as ArchiveHeader,
    authenticatedHeader,
    key,
    noncePrefix,
    payloadOffset: secondLineEnd + 1,
  }
}

class EncryptedFrameReader {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>
  private buffered = new Uint8Array(0)
  private ended = false
  private released = false

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader()
  }

  async readExact(length: number) {
    while (this.buffered.length < length && !this.ended) {
      const { done, value } = await this.reader.read()
      if (done) {
        this.ended = true
        break
      }
      this.buffered = concatenateBytes(this.buffered, value)
    }
    if (this.buffered.length < length) {
      if (this.buffered.length === 0) return null
      throw new Error('The encrypted backup ended in the middle of a frame.')
    }
    const value = this.buffered.slice(0, length)
    this.buffered = this.buffered.slice(length)
    return value
  }

  async assertNoTrailingData() {
    if ((await this.readExact(1)) !== null) throw new Error('The backup contains trailing data after its final frame.')
  }

  async release() {
    if (this.released) return
    this.released = true
    await this.reader.cancel().catch(() => undefined)
    this.reader.releaseLock()
  }
}

async function* decryptArchiveChunks(
  file: File,
  payloadOffset: number,
  key: CryptoKey,
  authenticatedHeader: Uint8Array,
  noncePrefix: Uint8Array,
) {
  const frames = new EncryptedFrameReader(file.slice(payloadOffset).stream())
  let chunkIndex = 0
  try {
    while (true) {
      const lengthBytes = await frames.readExact(4)
      if (!lengthBytes) throw new Error('The backup is missing its final frame.')
      const length = new DataView(lengthBytes.buffer, lengthBytes.byteOffset, 4).getUint32(0, false)
      if (length === 0) {
        await frames.assertNoTrailingData()
        return
      }
      if (length < 16 || length > ENCRYPTED_CHUNK_BYTES + 16) throw new Error('The encrypted backup contains an invalid chunk.')
      const ciphertext = await frames.readExact(length)
      if (!ciphertext) throw new Error('The encrypted backup is incomplete.')
      let plaintext: ArrayBuffer
      try {
        plaintext = await crypto.subtle.decrypt({
          name: 'AES-GCM',
          iv: frameNonce(noncePrefix, chunkIndex),
          additionalData: frameAdditionalData(authenticatedHeader, chunkIndex),
        }, key, ciphertext)
      } catch {
        throw new Error('The passphrase is incorrect or this backup file has been changed.')
      }
      yield new Uint8Array(plaintext)
      chunkIndex += 1
    }
  } finally {
    await frames.release()
  }
}

function createDecryptedArchiveStream(
  file: File,
  payloadOffset: number,
  key: CryptoKey,
  authenticatedHeader: Uint8Array,
  noncePrefix: Uint8Array,
) {
  const chunks = decryptArchiveChunks(file, payloadOffset, key, authenticatedHeader, noncePrefix)
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await chunks.next()
        if (next.done) controller.close()
        else controller.enqueue(next.value)
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await chunks.return(undefined)
    },
  }).pipeThrough(new DecompressionStream('gzip'))
}

async function* readArchiveRecords(stream: ReadableStream<Uint8Array>) {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader()
  let pending = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      pending += value ?? ''
      let lineEnd = pending.indexOf('\n')
      while (lineEnd >= 0) {
        const line = pending.slice(0, lineEnd)
        pending = pending.slice(lineEnd + 1)
        if (line.length > MAX_ARCHIVE_LINE_CHARS) throw new Error('A backup data row is too large to import.')
        if (line) {
          let record: unknown
          try {
            record = JSON.parse(line)
          } catch {
            throw new Error('The backup data is damaged.')
          }
          if (!isRecord(record)) throw new Error('The backup contains an invalid data row.')
          yield record
        }
        lineEnd = pending.indexOf('\n')
      }
      if (pending.length > MAX_ARCHIVE_LINE_CHARS) throw new Error('A backup data row is too large to import.')
      if (done) break
    }
    if (pending.trim()) {
      let record: unknown
      try {
        record = JSON.parse(pending)
      } catch {
        throw new Error('The backup data is damaged.')
      }
      if (!isRecord(record)) throw new Error('The backup contains an invalid data row.')
      yield record
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

async function uploadRows(jobId: string, table: BackupTable, startIndex: number, rows: Record<string, unknown>[]) {
  const result = await postJson<{ uploaded: number; nextIndex: number }>({
    action: 'upload-rows',
    jobId,
    table,
    startIndex,
    rows,
  })
  if (result.uploaded !== rows.length || result.nextIndex !== startIndex + rows.length) {
    throw new Error(`The ${table} upload was not acknowledged completely.`)
  }
}

async function uploadMedia(jobId: string, pathname: string, content: Uint8Array) {
  for (let offset = 0; offset < content.length; offset += MEDIA_CHUNK_BYTES) {
    const chunk = content.slice(offset, Math.min(offset + MEDIA_CHUNK_BYTES, content.length))
    const response = await fetch(API_PATH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Backup-Job-Id': jobId,
        'X-Backup-Pathname': encodeURIComponent(pathname),
        'X-Backup-Offset': String(offset),
      },
      body: new Blob([chunk]),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(isRecord(result) && typeof result.error === 'string' ? result.error : `A media upload failed (${response.status}).`)
    }
  }
}

function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`rounded-2xl border border-[#cfe2eb] bg-white p-5 sm:p-6 ${className}`}>{children}</section>
}

function ProgressStatus({ children }: { children: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm font-medium text-[#15384d]">
      <LoaderCircle size={16} className="animate-spin text-[#087ba5]" aria-hidden="true" />
      {children}
    </div>
  )
}

export function SiteBackupWorkspace() {
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [statusError, setStatusError] = useState('')
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [backupPassphrase, setBackupPassphrase] = useState('')
  const [backupPassphraseConfirmation, setBackupPassphraseConfirmation] = useState('')
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [working, setWorking] = useState(false)
  const [backupRows, setBackupRows] = useState(0)
  const [backupMediaBytes, setBackupMediaBytes] = useState(0)
  const [restoreRows, setRestoreRows] = useState(0)
  const [restoreTotalRows, setRestoreTotalRows] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    readStatus()
      .then((result) => {
        if (!cancelled) setStatus(result)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setStatusError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setBackupFile(file)
    setError('')
    setNotice('')
    setConfirmation('')
    setRestorePassphrase('')
  }

  async function takeBackup() {
    setError('')
    setNotice('')
    if (!status?.ready) {
      setError('Apply the required database migration before taking a backup.')
      return
    }
    if (backupPassphrase.length < 12) {
      setError('Use a backup passphrase with at least 12 characters.')
      return
    }
    if (backupPassphrase !== backupPassphraseConfirmation) {
      setError('The two backup passphrases do not match.')
      return
    }
    setWorking(true)
    setProgress('Preparing a consistent snapshot of store data…')
    setBackupRows(0)
    setBackupMediaBytes(0)
    let jobId: string | null = null
    let backupCreated = false
    try {
      const started = await postJson<{
        jobId: string
        manifest: ManifestEntry[]
        formatVersion: number
        schemaVersion: number
      }>({ action: 'start-export' })
      jobId = started.jobId
      if (started.formatVersion !== FORMAT_VERSION || started.schemaVersion !== SCHEMA_VERSION ||
        !validateManifest(started.manifest)) {
        throw new Error('The server returned a backup schema this app cannot export.')
      }
      setProgress('Reading store data and media…')
      const archive = await encryptArchive(jobId, started.manifest, backupPassphrase, (rows, mediaBytes) => {
        setBackupRows(rows)
        setBackupMediaBytes(mediaBytes)
      })
      const objectUrl = URL.createObjectURL(archive)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `isk-lenses-backup-${new Date().toISOString().slice(0, 10)}.iskbackup`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      backupCreated = true
      setNotice('Your encrypted backup is ready. Save the file and passphrase somewhere secure; this site cannot recover either one.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      if (jobId) {
        try {
          await cancelJob(jobId)
        } catch {
          if (backupCreated) setNotice('The encrypted backup was downloaded. Temporary server data could not be cleared; it becomes inaccessible after 12 hours and is purged when the next backup or restore starts.')
        }
      }
      setProgress('')
      setWorking(false)
    }
  }

  async function restoreBackup() {
    setError('')
    setNotice('')
    if (!status?.ready) {
      setError('Apply the required database migration before restoring a backup.')
      return
    }
    if (!backupFile) {
      setError('Choose an .iskbackup file first.')
      return
    }
    if (restorePassphrase.length < 12) {
      setError('Enter the backup passphrase with at least 12 characters.')
      return
    }
    if (confirmation !== RESTORE_CONFIRMATION) {
      setError(`Type ${RESTORE_CONFIRMATION} exactly to confirm.`)
      return
    }

    setWorking(true)
    setProgress('Checking the encrypted backup…')
    setRestoreRows(0)
    let jobId: string | null = null
    let restoreCompleted = false
    try {
      const archive = await parseArchiveHeader(backupFile, restorePassphrase)
      const totalRows = archive.header.manifest.reduce((sum, item) => sum + item.rowCount, 0)
      setRestoreTotalRows(totalRows)
      const begun = await postJson<{ jobId: string }>({
        action: 'begin-restore',
        formatVersion: archive.header.formatVersion,
        schemaVersion: archive.header.schemaVersion,
        manifest: archive.header.manifest,
        confirmation: RESTORE_CONFIRMATION,
      })
      const restoreJobId = begun.jobId
      jobId = restoreJobId
      setProgress('Decrypting and uploading store data…')
      const readable = createDecryptedArchiveStream(
        backupFile,
        archive.payloadOffset,
        archive.key,
        archive.authenticatedHeader,
        archive.noncePrefix,
      )
      const records = readArchiveRecords(readable)
      let manifestIndex = 0
      let tableRowIndex = 0
      let totalUploaded = 0
      let batch: Record<string, unknown>[] = []
      let batchStartIndex = 0

      const advanceEmptyTables = () => {
        while (manifestIndex < archive.header.manifest.length &&
          archive.header.manifest[manifestIndex].rowCount === 0) {
          manifestIndex += 1
          tableRowIndex = 0
        }
      }
      const flushBatch = async () => {
        if (!batch.length || manifestIndex >= archive.header.manifest.length) return
        await uploadRows(restoreJobId, archive.header.manifest[manifestIndex].name, batchStartIndex, batch)
        batch = []
      }
      advanceEmptyTables()

      for await (const rawRecord of records) {
        if (manifestIndex >= archive.header.manifest.length ||
          rawRecord.table !== archive.header.manifest[manifestIndex].name ||
          rawRecord.index !== tableRowIndex || !isRecord(rawRecord.data)) {
          throw new Error('The backup rows do not match the encrypted manifest.')
        }
        const entry = archive.header.manifest[manifestIndex]
        const data = rawRecord.data
        const index = tableRowIndex
        tableRowIndex += 1
        totalUploaded += 1
        if (totalUploaded % 25 === 0 || totalUploaded === totalRows) setRestoreRows(totalUploaded)

        if (entry.name === 'store_media_objects') {
          if (typeof rawRecord.mediaBase64 !== 'string' ||
            typeof data.pathname !== 'string' ||
            !Number.isSafeInteger(data.byte_length) || (data.byte_length as number) < 0 ||
            Object.hasOwn(data, 'content')) {
            throw new Error('The backup contains invalid media metadata.')
          }
          await flushBatch()
          const mediaBytes = base64ToBytes(rawRecord.mediaBase64)
          if (mediaBytes.byteLength !== data.byte_length) throw new Error(`Media length mismatch for ${data.pathname}.`)
          await uploadRows(restoreJobId, entry.name, index, [data])
          await uploadMedia(restoreJobId, data.pathname, mediaBytes)
        } else {
          if (Object.hasOwn(rawRecord, 'mediaBase64') || Object.hasOwn(data, 'content')) {
            throw new Error('The backup contains unexpected binary content.')
          }
          if (!batch.length) batchStartIndex = index
          const candidate = [...batch, data]
          const candidateBody = JSON.stringify({
            action: 'upload-rows',
            jobId: restoreJobId,
            table: entry.name,
            startIndex: batchStartIndex,
            rows: candidate,
          })
          if (batch.length && (candidate.length > MAX_UPLOAD_ROWS || encoder.encode(candidateBody).length > JSON_UPLOAD_LIMIT)) {
            await flushBatch()
            batchStartIndex = index
          }
          const singleRowBody = JSON.stringify({
            action: 'upload-rows',
            jobId: restoreJobId,
            table: entry.name,
            startIndex: index,
            rows: [data],
          })
          if (encoder.encode(singleRowBody).length > JSON_UPLOAD_LIMIT) throw new Error(`A ${entry.name} row is too large to upload.`)
          batch.push(data)
          if (batch.length >= MAX_UPLOAD_ROWS) await flushBatch()
        }

        if (tableRowIndex === entry.rowCount) {
          await flushBatch()
          manifestIndex += 1
          tableRowIndex = 0
          advanceEmptyTables()
        }
      }
      await flushBatch()
      if (manifestIndex !== archive.header.manifest.length || totalUploaded !== totalRows) {
        throw new Error('The backup ended before every manifest row was uploaded.')
      }
      setProgress('Verifying and restoring all store data…')
      await postJson({ action: 'complete-restore', jobId: restoreJobId, confirmation: RESTORE_CONFIRMATION })
      restoreCompleted = true
      setNotice('Store data and media were restored. The destination admin account and server environment values were preserved; sign in using the destination account.')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      if (jobId && !restoreCompleted) {
        try {
          await cancelJob(jobId)
        } catch {
          setNotice('The restore did not complete. Its temporary upload becomes inaccessible after 12 hours and is purged when the next backup or restore starts.')
        }
      }
      setProgress('')
      setWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-[-.04em] text-[#15384d]">Backup and move your store</h1>
          <p className="mt-2 text-sm leading-6 text-[#526b7b]">
            Download one encrypted file, deploy the app to another Vercel account, then upload that file here to restore your store data.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#e8f6fb] px-3 py-2 text-xs font-semibold text-[#15384d]">
          <ShieldCheck size={16} aria-hidden="true" />
          Owner-only controls
        </div>
      </header>

      {(error || statusError) && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#b4233e]/25 bg-[#fff4f5] px-4 py-3 text-sm leading-5 text-[#8b2437]">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error || statusError}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-[#087ba5]/20 bg-[#e8f6fb] px-4 py-3 text-sm leading-5 text-[#15384d]">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}
      {progress && <ProgressStatus>{progress}</ProgressStatus>}

      {!loadingStatus && status && !status.ready && (
        <div role="status" className="rounded-xl border border-[#b66b24]/30 bg-[#fff8ed] p-4 text-sm leading-6 text-[#684117]">
          <strong className="font-semibold">Database setup required.</strong>{' '}
          Apply <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{status.requiredMigration}</code> to this database before using backup or restore. This page does not apply migrations.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f6fb] text-[#006f9b]">
              <ArrowDownToLine size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#15384d]">Take full backup</h2>
              <p className="mt-1 text-sm leading-5 text-[#526b7b]">
                Export {status?.tables ?? EXPECTED_TABLES.length} store tables and stored media into a password-encrypted <code>.iskbackup</code> file.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-[#15384d]">
              Backup passphrase
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={backupPassphrase}
                onChange={(event) => setBackupPassphrase(event.target.value)}
                placeholder="Use at least 12 characters"
                className="rounded-xl border border-[#b8d4e0] bg-white px-3 py-2.5 text-sm font-normal text-[#15384d] outline-none focus:border-[#087ba5] focus:ring-2 focus:ring-[#087ba5]/20"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-[#15384d]">
              Confirm passphrase
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                value={backupPassphraseConfirmation}
                onChange={(event) => setBackupPassphraseConfirmation(event.target.value)}
                placeholder="Re-enter the same passphrase"
                className="rounded-xl border border-[#b8d4e0] bg-white px-3 py-2.5 text-sm font-normal text-[#15384d] outline-none focus:border-[#087ba5] focus:ring-2 focus:ring-[#087ba5]/20"
              />
            </label>
            {(backupRows > 0 || backupMediaBytes > 0) && (
              <p className="text-xs text-[#526b7b]">
                Processed {backupRows.toLocaleString()} rows · {(backupMediaBytes / (1024 * 1024)).toFixed(1)} MB of media
              </p>
            )}
            <button
              type="button"
              onClick={takeBackup}
              disabled={working || loadingStatus || !status?.ready}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#006f9b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#005b7f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileArchive size={17} aria-hidden="true" />
              Take full backup
            </button>
            <p className="text-xs leading-5 text-[#526b7b]">
              The passphrase stays in this browser and is never sent to the server. If it is lost, the backup cannot be opened.
            </p>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e8f6fb] text-[#006f9b]">
              <ArrowUpFromLine size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#15384d]">Restore from backup</h2>
              <p className="mt-1 text-sm leading-5 text-[#526b7b]">
                Choose the encrypted file created by this page, enter its passphrase, then confirm the replacement.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            <input
              ref={fileInput}
              type="file"
              accept=".iskbackup,application/octet-stream"
              onChange={onFileSelected}
              className="sr-only"
              aria-label="Choose an ISK Lenses backup file"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={working}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed border-[#b8d4e0] bg-[#f7fcff] px-4 text-left transition-colors hover:border-[#087ba5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileArchive size={20} className="shrink-0 text-[#087ba5]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#15384d]">{backupFile?.name ?? 'Choose an .iskbackup file'}</span>
                <span className="mt-0.5 block text-xs text-[#526b7b]">{backupFile ? `${(backupFile.size / (1024 * 1024)).toFixed(1)} MB` : 'The archive is decrypted only in this browser.'}</span>
              </span>
            </button>
            <label className="grid gap-1.5 text-sm font-medium text-[#15384d]">
              Backup passphrase
              <input
                type="password"
                autoComplete="current-password"
                value={restorePassphrase}
                onChange={(event) => setRestorePassphrase(event.target.value)}
                placeholder="Enter the passphrase used for this file"
                className="rounded-xl border border-[#b8d4e0] bg-white px-3 py-2.5 text-sm font-normal text-[#15384d] outline-none focus:border-[#087ba5] focus:ring-2 focus:ring-[#087ba5]/20"
              />
            </label>
            <div className="rounded-xl border border-[#b4233e]/20 bg-[#fff8f8] p-3.5 text-sm leading-5 text-[#713040]">
              <div className="flex items-start gap-2 font-semibold">
                <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                This replaces destination store data
              </div>
              <p className="mt-1.5">
                Products, orders, customers, reviews, settings, and media will be replaced. The destination owner account and server secrets are kept.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-[#15384d]">
              Type <code className="font-mono text-xs">{RESTORE_CONFIRMATION}</code> to confirm
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="rounded-xl border border-[#b8d4e0] bg-white px-3 py-2.5 text-sm font-normal text-[#15384d] outline-none focus:border-[#087ba5] focus:ring-2 focus:ring-[#087ba5]/20"
              />
            </label>
            {restoreTotalRows > 0 && (
              <p className="text-xs text-[#526b7b]">
                Uploaded {restoreRows.toLocaleString()} of {restoreTotalRows.toLocaleString()} rows
              </p>
            )}
            <button
              type="button"
              onClick={restoreBackup}
              disabled={working || loadingStatus || !status?.ready || !backupFile}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#006f9b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#005b7f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockKeyhole size={17} aria-hidden="true" />
              Restore all store data
            </button>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#15384d]">Move the app to another Vercel account</h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-[#526b7b]">
              Hosting setup requires authorization from the destination account owner. This button opens Vercel’s GitHub import flow; it does not create the project or configure secrets automatically.
            </p>
          </div>
          <a
            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fqaiserfccc%2Fe-commerce-app-design"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#b8d4e0] px-4 py-2 text-sm font-semibold text-[#15384d] transition-colors hover:border-[#087ba5] hover:bg-[#f7fcff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]"
          >
            <Cloud size={17} aria-hidden="true" />
            Open Vercel import
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        <ol className="mt-5 grid gap-x-8 gap-y-4 border-t border-[#cfe2eb] pt-5 text-sm leading-5 text-[#526b7b] md:grid-cols-2">
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f6fb] font-semibold text-[#006f9b]">1</span>
            <span><strong className="text-[#15384d]">Import the GitHub repository</strong><br />Sign in to the destination Vercel account and authorize the import.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f6fb] font-semibold text-[#006f9b]">2</span>
            <span><strong className="text-[#15384d]">Create a destination Neon database</strong><br />Set its server-only <code className="font-mono text-xs">DATABASE_URL</code> and a new <code className="font-mono text-xs">ADMIN_SESSION_SECRET</code> in Vercel.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f6fb] font-semibold text-[#006f9b]">3</span>
            <span><strong className="text-[#15384d]">Prepare the destination admin</strong><br />Apply the database migrations and provision an owner account before opening Admin.</span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e8f6fb] font-semibold text-[#006f9b]">4</span>
            <span><strong className="text-[#15384d]">Upload and restore the file</strong><br />Sign in as the destination owner, return to this page, and follow the restore steps above.</span>
          </li>
        </ol>
        <div className="mt-5 flex items-start gap-2 border-t border-[#cfe2eb] pt-4 text-xs leading-5 text-[#526b7b]">
          <Database size={15} className="mt-0.5 shrink-0 text-[#087ba5]" aria-hidden="true" />
          <p>
            The backup includes store data and Neon-stored media only. It excludes the app source code, admin accounts, environment variables, API keys, and provider credentials; configure those separately and securely.
          </p>
        </div>
      </Panel>

      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-[#526b7b]">
        <KeyRound size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          The archive contains sensitive customer, order, and business data protected with your passphrase. Keep the file and passphrase in separate secure locations.           Temporary staging is deleted when the operation finishes or is cancelled. Abandoned jobs become inaccessible after 12 hours and are purged when the next backup or restore starts.
        </span>
      </p>
    </div>
  )
}
