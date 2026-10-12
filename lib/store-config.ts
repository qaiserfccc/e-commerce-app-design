import type { Product } from '@/lib/hooks/use-storefront-data'
import type { ProductCategory } from '@/lib/hooks/use-storefront-categories'

export const STORE_NAME = 'ISK Lenses'

// Contact details are optional and come from the environment; nothing is shown when unset.
export const storeContact = {
  phone: process.env.NEXT_PUBLIC_STORE_PHONE?.trim() || '',
  email: process.env.NEXT_PUBLIC_STORE_EMAIL?.trim() || '',
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP?.replace(/[^\d]/g, '') || '',
  instagram: process.env.NEXT_PUBLIC_STORE_INSTAGRAM_URL?.trim() || '',
  facebook: process.env.NEXT_PUBLIC_STORE_FACEBOOK_URL?.trim() || '',
}

export function formatPrice(value: string | number, currency: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return `${currency} ${value}`
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(0)}`
  }
}

export function lowestPrice(product: Product) {
  const variants = product.variants ?? []
  if (!variants.length) return { price: product.price, currency: product.currency, hasOptions: false }
  const lowest = variants.reduce((best, variant) => (Number(variant.price) < Number(best.price) ? variant : best))
  return { price: lowest.price, currency: lowest.currency, hasOptions: true }
}

export function isAvailable(product: Product) {
  return product.variants?.length
    ? product.variants.some((variant) => variant.stockQuantity > 0)
    : product.stockQuantity > 0
}

export function categoryHref(category: Pick<ProductCategory, 'slug'>) {
  return `/product-category/${category.slug}`
}

export function categoryTree(categories: ProductCategory[]) {
  const children = new Map<number, ProductCategory[]>()
  for (const category of categories) {
    if (category.slug === 'all-products') continue
    const siblings = children.get(category.parentSourceCategoryId) ?? []
    siblings.push(category)
    children.set(category.parentSourceCategoryId, siblings)
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.name.localeCompare(b.name))
  return children
}

export function titleCase(value: string) {
  return value.toLocaleLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase())
}
