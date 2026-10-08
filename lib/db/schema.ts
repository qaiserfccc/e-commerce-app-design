import { bigint, boolean, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const storeProducts = pgTable('store_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  category: text('category').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('active'),
  stockQuantity: integer('stock_quantity').notNull().default(0),
  heroImageUrl: text('hero_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeCustomers = pgTable('store_customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  phone: text('phone'),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeOrders = pgTable('store_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: bigint('order_number', { mode: 'number' }).generatedAlwaysAsIdentity().unique(),
  customerId: uuid('customer_id').notNull(),
  status: text('status').notNull().default('pending'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  shippingTotal: numeric('shipping_total', { precision: 12, scale: 2 }).notNull().default('0'),
  taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  shippingAddress: jsonb('shipping_address').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeOrderItems = pgTable('store_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull(),
  productId: uuid('product_id').notNull(),
  productName: text('product_name').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeProductAssets = pgTable('store_product_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull(),
  blobPathname: text('blob_pathname').notNull(),
  blobUrl: text('blob_url'),
  altText: text('alt_text'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeActivityEvents = pgTable('store_activity_events', {
  id: bigint('id', { mode: 'number' }).generatedAlwaysAsIdentity().primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storeAdminUsers = pgTable('store_admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('staff'),
  isActive: boolean('is_active').notNull().default(true),
  sessionVersion: integer('session_version').notNull().default(1),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailUnique: uniqueIndex('store_admin_users_email_unique').on(sql`lower(${table.email})`),
}))
