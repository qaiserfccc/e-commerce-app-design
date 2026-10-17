// Downloads externally hosted storefront content images, uploads them to Vercel Blob and rewrites DB URLs.
// Needs DATABASE_URL and BLOB_READ_WRITE_TOKEN. Idempotent: only rows still on a non-Blob host are processed.
import { put } from '@vercel/blob'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL })
await client.connect()
const cache = new Map()
const isBlob = (u) => /\.public\.blob\.vercel-storage\.com\//.test(u)

async function mirror(url) {
  if (isBlob(url)) return url
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const type = res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream'
  if (!type.startsWith('image/')) throw new Error(`not image ${url}`)
  const name = new URL(url).pathname.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_')
  const blob = await put(`content/${name}`, Buffer.from(await res.arrayBuffer()), { access: 'public', contentType: type, addRandomSuffix: true })
  cache.set(url, blob.url)
  return blob.url
}

const banners = (await client.query('select id, image_url from store_banners')).rows
for (const b of banners) {
  try {
    const next = await mirror(b.image_url)
    if (next !== b.image_url) await client.query('update store_banners set image_url=$1, updated_at=now() where id=$2', [next, b.id])
  } catch (e) { console.error('banner failed', e.message) }
}
const footer = (await client.query("select value from store_settings where key='footer'")).rows[0]
if (footer?.value?.logo) {
  try {
    footer.value.logo = await mirror(footer.value.logo)
    await client.query("update store_settings set value=$1, updated_at=now() where key='footer'", [footer.value])
  } catch (e) { console.error('footer failed', e.message) }
}
const left = (await client.query("select count(*) from store_banners where image_url !~ 'blob.vercel-storage.com'")).rows[0].count
console.log('uploaded', cache.size, 'remaining external banners', left)
await client.end()
