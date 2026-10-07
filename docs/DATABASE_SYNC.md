# Database Sync Architecture

## Overview

This e-commerce platform implements a **database-driven, real-time sync architecture** that keeps the storefront and admin workspace synchronized across all data operations.

## Architecture Layers

### 1. Data Access Layer (`app/actions/`)

- **`storefront.ts`** - Public read-only operations for the storefront
  - Get active products
  - Search products by name or category
  - Fetch customer orders
  - Create customers and orders
  - No authentication required

- **`admin.ts`** - Protected read/write operations for the admin workspace
  - Create, update, delete products
  - Manage product assets and inventory
  - Update order statuses
  - Manage customers
  - View analytics and activity logs
  - All mutations logged in `store_activity_events` table

### 2. API Routes (`app/api/`)

- **`/api/products`** - GET endpoint for public product listing
  - Supports category filtering
  - Includes product assets
  - Cache: 60s stale-while-revalidate 300s
  
- **`/api/admin/metrics`** - GET endpoint for dashboard metrics (TODO: add auth)
  - Total revenue, orders, customers
  - No caching (must-revalidate)
  - 30s refresh rate

### 3. Real-Time Sync with SWR

#### Storefront Hooks (`lib/hooks/use-storefront-data.ts`)

```typescript
// Auto-revalidates products every 60 seconds
const { products, isLoading, mutate } = useProducts(category)

// Single product detailed view
const { product, isLoading, mutate } = useProduct(slug)
```

#### Admin Hooks (`lib/hooks/use-admin-data.ts`)

```typescript
// Dashboard metrics with 30s refresh
const { metrics, isLoading, mutate } = useAdminMetrics()

// Manual refresh after mutations
const { refresh } = useAdminRefresh()
```

## Data Flow

### Storefront Reading

```
User Browses Store
    ↓
useProducts() / useProduct() (SWR)
    ↓
/api/products endpoint
    ↓
Storefront server actions (getActiveProducts, getProductBySlug)
    ↓
Neon Postgres Database
    ↓
Response with assets (returned to browser)
```

### Admin Writing

```
Admin Creates/Updates Product
    ↓
Admin server action (createProduct, updateProduct)
    ↓
Neon Postgres Database
    ↓
Activity logged in store_activity_events table
    ↓
Admin calls mutate() to refresh local SWR cache
    ↓
useAdminMetrics() auto-revalidates (30s)
    ↓
Storefront useProducts() auto-revalidates (60s)
    ↓
Customers see changes in ~60s without page refresh
```

### Order Processing

```
Customer Completes Checkout
    ↓
createOrder() server action (storefront)
    ↓
Creates order + items in Postgres
    ↓
Admin sees order in dashboard (30s refresh)
    ↓
Admin updates order status via updateOrderStatus()
    ↓
Activity logged, customer can view order history
```

## Database Schema

All tables include automatic `updated_at` timestamps via PostgreSQL trigger:

- `store_products` - Product catalog with inventory
- `store_customers` - Customer records (unique by email)
- `store_orders` - Order headers
- `store_order_items` - Order line items
- `store_product_assets` - Product images/media via Blob storage
- `store_activity_events` - Immutable audit log of all mutations

## Consistency Guarantees

1. **Strong Read Consistency** - All reads go directly to Postgres
2. **Write Isolation** - Server actions enforce ACID transactions
3. **Activity Audit Trail** - Every write creates an entry in `store_activity_events`
4. **Eventual UI Consistency** - SWR revalidation intervals ensure UI catches up:
   - Admin: 30s
   - Storefront: 60s
5. **Manual Refresh** - Call `mutate()` hook immediately after mutations for instant UI update

## Performance Considerations

### Caching Strategy

- **Products API**: 60s max-age + 300s stale-while-revalidate
  - Serves stale data while revalidating in background
  - Reduces database load without stale data reaching users (after 5 min)
  
- **Metrics API**: no-cache, must-revalidate
  - Always fresh for admin dashboard
  - 30s refresh rate via SWR

### Optimization Tips

1. **Manual Mutate** - After admin creates/updates, call `mutate()` to see changes instantly
2. **Category Filtering** - Use `/api/products?category=X` to reduce payload
3. **Batch Operations** - Group multiple DB writes in a single server action
4. **Asset CDN** - Product images served via Vercel Blob with edge caching

## Future Enhancements

1. **Realtime Subscriptions** - Replace SWR intervals with WebSocket for instant updates
2. **Optimistic Updates** - Update UI before server confirms, rollback on error
3. **Infinite Scroll** - Paginate product lists with cursor-based queries
4. **Full-Text Search** - Add Postgres FTS or external search service
5. **Rate Limiting** - Throttle storefront API by IP/session
6. **Admin Auth** - Lock down admin endpoints with session validation

## Troubleshooting

### Changes not appearing after admin update?

- Check network tab: Admin metrics endpoint called?
- Wait 30s: SWR revalidation should pick up changes
- Manual refresh: Call `mutate()` from admin hooks

### Slow product loading?

- Check `/api/products` response time
- Verify Postgres connection: `echo $DATABASE_URL`
- Review indexes on `store_products` table
- Consider pagination if catalog grows beyond 1000 items

### Stale data on storefront?

- Storefront revalidates every 60s automatically
- Manual refresh: Ctrl+Shift+R or call `mutate()` hook
- Check: Is admin mutation actually hitting database? (check activity log)
