import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      name: 'ISK Lenses API',
      version: '1.0.0',
      openapi: '/api/openapi.json',
      integrationGuide: 'docs/API_MOBILE_INTEGRATION.md in the repository',
      authentication: {
        shopper: 'HttpOnly session cookie from POST /api/storefront/session',
        admin: 'HttpOnly session cookie from POST /api/admin/session',
      },
      endpoints: {
        catalog: [
          'GET /api/products',
          'GET /api/products/{slug}',
          'GET /api/product-categories',
          'GET /api/brands',
          'GET /api/lens-shades',
          'GET /api/lens-types',
          'GET /api/delivery-rules',
          'GET /api/products/{slug}/reviews',
          'POST /api/products/{slug}/reviews',
        ],
        shopper: [
          'GET, POST /api/storefront/session',
          'POST /api/orders',
          'GET /api/storefront/orders',
        ],
        integrations: [
          'GET /api/chatbot/knowledge',
          'GET, HEAD /api/media/{path}',
          'GET, POST /api/webhooks/meta-leads',
          'POST /api/errors',
        ],
        admin: [
          'GET /api/admin/session',
          'POST, DELETE /api/admin/session',
          'GET, POST /api/admin/password-reset',
          'GET /api/admin/products',
          'GET /api/admin/orders',
          'GET /api/admin/customers',
          'GET /api/admin/crm',
          'GET /api/admin/activity',
          'GET /api/admin/metrics',
          'PATCH, DELETE /api/admin/assets/{assetId}',
          'POST /api/admin/products/{productId}/assets',
          'POST /api/admin/content/upload',
          'POST /api/admin/catalog-sync',
        ],
      },
      note: 'Mutating requests from native clients may omit Origin. Browser cross-origin writes remain rejected.',
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
