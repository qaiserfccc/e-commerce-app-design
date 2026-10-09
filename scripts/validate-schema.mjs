#!/usr/bin/env node

/**
 * Schema Validation Script
 * Validates that all database tables exist with correct structure
 * Run: node --env-file-if-exists=/vercel/share/.env.project scripts/validate-schema.mjs
 */

import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

const REQUIRED_TABLES = [
  'store_products',
  'store_customers',
  'store_orders',
  'store_order_items',
  'store_product_assets',
  'store_product_variants',
  'store_activity_events',
  'store_admin_users',
]

const TABLE_SCHEMAS = {
  store_products: [
    'id',
    'name',
    'slug',
    'description',
    'category',
    'price',
    'currency',
    'status',
    'stock_quantity',
    'hero_image_url',
    'source_product_id',
    'source_url',
    'source_image_url',
    'created_at',
    'updated_at',
  ],
  store_customers: ['id', 'email', 'first_name', 'last_name', 'phone', 'marketing_opt_in', 'created_at', 'updated_at'],
  store_orders: [
    'id',
    'order_number',
    'customer_id',
    'status',
    'subtotal',
    'shipping_total',
    'tax_total',
    'total',
    'currency',
    'shipping_address',
    'created_at',
    'updated_at',
  ],
  store_order_items: [
    'id',
    'order_id',
    'product_id',
    'product_name',
    'unit_price',
    'quantity',
    'line_total',
    'created_at',
  ],
  store_product_assets: ['id', 'product_id', 'blob_pathname', 'blob_url', 'alt_text', 'media_type', 'sort_order', 'created_at'],
  store_product_variants: [
    'id',
    'product_id',
    'sku',
    'name',
    'color',
    'power_diopters',
    'base_curve',
    'diameter_mm',
    'pack_size',
    'price',
    'currency',
    'stock_quantity',
    'is_active',
    'created_at',
    'updated_at',
  ],
  store_activity_events: ['id', 'entity_type', 'entity_id', 'event_type', 'payload', 'created_at'],
  store_admin_users: [
    'id',
    'email',
    'password_hash',
    'role',
    'is_active',
    'session_version',
    'last_login_at',
    'created_at',
    'updated_at',
  ],
}

async function validateSchema() {
  try {
    console.log('🔍 Validating database schema...\n')
    let hasErrors = false

    for (const tableName of REQUIRED_TABLES) {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `,
        [tableName],
      )

      if (!result.rows[0].exists) {
        console.error(`❌ Table missing: ${tableName}`)
        hasErrors = true
        continue
      }

      // Get columns
      const columnsResult = await pool.query(
        `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName],
      )

      const columns = columnsResult.rows.map((row) => row.column_name)
      const expectedColumns = TABLE_SCHEMAS[tableName]

      const missing = expectedColumns.filter((col) => !columns.includes(col))
      const extra = columns.filter((col) => !expectedColumns.includes(col))

      if (missing.length === 0 && extra.length === 0) {
        console.log(`✅ ${tableName}`)
      } else {
        console.log(`⚠️  ${tableName}`)
        if (missing.length > 0) {
          console.log(`   Missing: ${missing.join(', ')}`)
          hasErrors = true
        }
        if (extra.length > 0) console.log(`   Extra: ${extra.join(', ')}`)
      }
    }

    // Check triggers
    console.log('\n🔍 Validating triggers...')
    const triggerResult = await pool.query(`
      SELECT trigger_name FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `)

    const triggers = triggerResult.rows.map((row) => row.trigger_name)
    const requiredTriggers = [
      'store_products_updated_at',
      'store_customers_updated_at',
      'store_orders_updated_at',
      'store_product_variants_updated_at',
    ]

    for (const trigger of requiredTriggers) {
      if (triggers.includes(trigger)) {
        console.log(`✅ ${trigger}`)
      } else {
        console.log(`⚠️  ${trigger} (missing)`)
        hasErrors = true
      }
    }

    console.log(hasErrors ? '\n❌ Schema validation failed' : '\n✅ Schema validation complete')
    if (hasErrors) process.exitCode = 1
  } catch (error) {
    console.error('❌ Validation error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

validateSchema()
