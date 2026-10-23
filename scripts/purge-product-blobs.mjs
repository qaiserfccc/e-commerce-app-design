// Deletes the Vercel Blob files referenced by product assets (run before wiping products).
import { del } from '@vercel/blob'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL })
await client.connect()
const { rows } = await client.query(
  `select blob_url as url from store_product_assets where blob_url like 'https://%.blob.vercel-storage.com/%'
   union select hero_image_url from store_products where hero_image_url like 'https://%.blob.vercel-storage.com/%'`,
)
const urls = rows.map((row) => row.url)
for (let i = 0; i < urls.length; i += 100) await del(urls.slice(i, i + 100))
console.log('deleted blobs:', urls.length)
await client.end()
