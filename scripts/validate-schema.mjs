#!/usr/bin/env node

/**
 * Schema Validation Script
 * Validates that all database tables exist with correct structure
 * Run: node --env-file-if-exists=/vercel/share/.env.project scripts/validate-schema.mjs
 */

import { Pool } from 'pg'
import { normalizePostgresConnectionString } from '../lib/db/postgres-connection.mjs'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set')
  process.exit(1)
}

const pool = new Pool({
  connectionString: normalizePostgresConnectionString(DATABASE_URL),
})

const REQUIRED_TABLES = [
  'store_products',
  'store_customers',
  'store_orders',
  'store_order_items',
  'store_product_assets',
  'store_categories',
  'store_product_variants',
  'store_product_reviews',
  'store_product_relations',
  'store_activity_events',
  'store_growth_events',
  'store_admin_users',
  'store_banners',
  'store_reviews',
  'store_settings',
  'store_brands',
  'store_lens_shades',
  'store_lens_types',
  'store_error_logs',
  'store_media_objects',
  'store_crm_leads',
  'store_site_backup_jobs',
  'store_site_backup_rows',
]

const TABLE_SCHEMAS = {
  store_products: [
    'id', 'name', 'slug', 'description', 'category_id', 'brand', 'brand_id', 'lens_shade_id', 'lens_type_id', 'source_product_id', 'source_url', 'source_payload', 'source_content_hash', 'source_image_url', 'sku', 'short_description', 'price', 'compare_at_price',
    'currency', 'status', 'stock_quantity', 'hero_image_url', 'colors', 'diameter_mm', 'base_curve', 'water_content',
    'material', 'wear_duration', 'pack_contents', 'power_type', 'power_range', 'available_power_ranges', 'uv_protection', 'fda_approved', 'features', 'specs',
    'usage_instructions', 'is_featured', 'is_new_arrival', 'is_on_sale', 'seo_title', 'seo_description', 'seo_focus_keywords', 'created_at', 'updated_at',
  ],
  store_customers: [
    'id',
    'email',
    'first_name',
    'last_name',
    'phone',
    'password_hash',
    'session_version',
    'marketing_opt_in',
    'created_at',
    'updated_at',
  ],
  store_orders: [
    'id',
    'order_number',
    'customer_id',
    'status',
    'payment_method',
    'shipping_fee_confirmed',
    'account_id',
    'checkout_key',
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
    'variant_id',
    'inventory_reserved',
    'unit_price',
    'quantity',
    'line_total',
    'power_left',
    'power_right',
    'created_at',
  ],
  store_product_assets: ['id', 'product_id', 'blob_pathname', 'blob_url', 'alt_text', 'media_type', 'sort_order', 'created_at'],
  store_categories: ['id', 'parent_id', 'source_category_id', 'source_image_url', 'name', 'slug', 'description', 'image_url', 'sort_order', 'is_active', 'show_in_menu', 'seo_title', 'seo_description', 'created_at', 'updated_at'],
  store_product_reviews: ['id', 'product_id', 'author', 'rating', 'title', 'body', 'is_approved', 'created_at'],
  store_product_relations: ['product_id', 'related_product_id', 'sort_order'],
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
  store_growth_events: ['event_id', 'session_id', 'event_name', 'page_path', 'product_id', 'value', 'currency', 'created_at'],
  store_banners: ['id', 'placement', 'title', 'body', 'image_url', 'blob_pathname', 'href', 'sort_order', 'is_active', 'created_at', 'updated_at'],
  store_reviews: ['id', 'author', 'body', 'sort_order', 'is_active', 'created_at', 'updated_at'],
  store_settings: ['key', 'value', 'updated_at'],
  store_brands: ['id', 'name', 'slug', 'logo_url', 'is_active', 'created_at', 'updated_at'],
  store_lens_shades: ['id', 'name', 'hex', 'image_url', 'source_image_url', 'is_active', 'created_at', 'updated_at'],
  store_lens_types: ['id', 'name', 'source_category_id', 'is_active', 'created_at', 'updated_at'],
  store_error_logs: ['id', 'source', 'error_name', 'message', 'stack', 'created_at'],
  store_media_objects: ['pathname', 'content_type', 'byte_length', 'digest', 'content', 'created_at', 'updated_at'],
  store_crm_leads: [
    'id', 'source', 'status', 'full_name', 'email', 'phone', 'notes', 'follow_up_at', 'matched_customer_id',
    'meta_lead_id', 'meta_page_id', 'meta_form_id', 'meta_ad_id', 'meta_campaign_id', 'created_at', 'updated_at',
  ],
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
  store_site_backup_jobs: ['id', 'user_id', 'operation', 'manifest', 'created_at', 'expires_at'],
  store_site_backup_rows: ['job_id', 'table_name', 'row_index', 'row_data', 'media_content'],
}

async function validateSchema() {
  try {
    console.log('🔍 Validating database schema...\n')
    let hasErrors = false
    let growthTableExists = false

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
      if (tableName === 'store_growth_events') growthTableExists = true

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

    console.log('\n🔍 Validating product catalog constraints...')
    const columnResult = await pool.query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('store_products', 'base_curve'),
          ('store_products', 'water_content'),
          ('store_products', 'seo_focus_keywords'),
          ('store_product_variants', 'base_curve')
        )
    `)
    const columns = new Map(columnResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.is_nullable]))
    for (const column of [
      'store_products.base_curve',
      'store_products.water_content',
      'store_products.seo_focus_keywords',
      'store_product_variants.base_curve',
    ]) {
      if (columns.get(column) === 'NO') {
        console.log(`✅ ${column} is required`)
      } else {
        console.error(`❌ ${column} must be present and NOT NULL`)
        hasErrors = true
      }
    }
    const baseCurveTypesResult = await pool.query(`
      SELECT relation.relname AS table_name, attribute.attname AS column_name,
        format_type(attribute.atttypid, attribute.atttypmod) AS formatted_type
      FROM pg_attribute AS attribute
      JOIN pg_class AS relation ON relation.oid = attribute.attrelid
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname IN ('store_products', 'store_product_variants')
        AND attribute.attname = 'base_curve'
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    `)
    const baseCurveTypes = new Map(baseCurveTypesResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row.formatted_type]))
    for (const column of ['store_products.base_curve', 'store_product_variants.base_curve']) {
      if (baseCurveTypes.get(column) === 'numeric') {
        console.log(`✅ ${column} accepts unrestricted numeric values`)
      } else {
        console.error(`❌ ${column} must use unrestricted numeric`)
        hasErrors = true
      }
    }

    const constraintResult = await pool.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid IN (
        'public.store_products'::regclass,
        'public.store_product_variants'::regclass
      )
    `)
    const constraints = new Set(constraintResult.rows.map((row) => row.conname))
    if (constraints.has('store_products_water_content_allowed_check')) {
      console.log('✅ store_products_water_content_allowed_check')
    } else {
      console.error('❌ store_products_water_content_allowed_check (missing)')
      hasErrors = true
    }
    for (const constraint of [
      'store_products_base_curve_fixed_check',
      'store_product_variants_base_curve_fixed_check',
    ]) {
      if (constraints.has(constraint)) {
        console.error(`❌ ${constraint} must be removed`)
        hasErrors = true
      } else {
        console.log(`✅ ${constraint} is absent`)
      }
    }

    if (growthTableExists) {
      console.log('\n🔍 Validating growth analytics constraints...')
      const growthConstraintRows = await pool.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.store_growth_events'::regclass
      `)
      const growthConstraints = new Set(growthConstraintRows.rows.map((row) => row.conname))
      for (const constraint of [
        'store_growth_events_event_name_check',
        'store_growth_events_page_path_check',
        'store_growth_events_value_check',
        'store_growth_events_currency_check',
      ]) {
        if (growthConstraints.has(constraint)) {
          console.log(`✅ ${constraint}`)
        } else {
          console.error(`❌ ${constraint} (missing)`)
          hasErrors = true
        }
      }
    }

    const settingsConstraintResult = await pool.query(`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'public.store_settings'::regclass
        AND conname = 'store_settings_key_check'
    `)
    const settingsConstraint = settingsConstraintResult.rows[0]?.definition ?? ''
    for (const settingKey of ['marketing_integrations', 'cro_actions']) {
      if (settingsConstraint.includes(`'${settingKey}'`)) {
        console.log(`✅ store_settings allows ${settingKey}`)
      } else {
        console.error(`❌ store_settings_key_check is missing ${settingKey}`)
        hasErrors = true
      }
    }

    const valuesResult = await pool.query(`
      SELECT
        count(*) FILTER (WHERE water_content IS NULL OR water_content NOT IN ('38%', '40%', '45%', '48%', '50%', '55%', '58%', '60%'))::int AS invalid_water_contents
      FROM public.store_products
    `)
    if (valuesResult.rows[0].invalid_water_contents === 0) {
      console.log('✅ Existing product water-content values are supported')
    } else {
      console.error('❌ Existing products contain unsupported water-content values')
      hasErrors = true
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
      'store_crm_leads_updated_at',
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
