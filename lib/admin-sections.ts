export const ADMIN_SECTION_IDS = [
  'overview',
  'categories',
  'brands',
  'lens-shades',
  'lens-types',
  'catalog-sync',
  'error-logs',
  'products',
  'catalog-settings',
  'orders',
  'customers',
  'analytics',
  'content',
  'delivery',
  'system-users',
  'project-plan',
] as const

export type AdminSectionId = (typeof ADMIN_SECTION_IDS)[number]
