import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StorefrontProductDetail } from '@/components/storefront/product-detail'
import { getApprovedReviews, getCategories, getProduct, getProductPageSettings, getProductSeoMetadata, getProductSections } from '@/lib/data/catalog'
import type { Product } from '@/lib/hooks/use-storefront-data'

export const dynamic = 'force-dynamic'

type ProductPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ option?: string }>
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function absoluteUrl(value: string) {
  return new URL(value, 'https://isklenses.com').toString()
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { robots: { index: false, follow: false } }
  }
  const product = await getProduct(slug)
  if (!product) return { robots: { index: false, follow: false } }

  const seo = await getProductSeoMetadata(slug)
  const fields = seo?.fields ?? {}
  const canonical = `https://isklenses.com/product/${product.slug}`
  const title = text(product.seoTitle) ?? text(seo?.title) ?? product.name
  const description = text(product.seoDescription) ?? text(seo?.description) ??
    text(product.shortDescription) ?? text(product.description) ??
    `Shop ${product.name} contact lenses from ISK Lenses in Pakistan.`
  const image = text(fields['og:image']) ?? text(product.heroImageUrl)
  const imageWidth = Number(fields['og:image:width'])
  const imageHeight = Number(fields['og:image:height'])
  const importedKeywords = Array.isArray(fields.keywords)
    ? fields.keywords.filter((keyword): keyword is string => typeof keyword === 'string').map((keyword) => keyword.trim()).filter(Boolean)
    : text(fields.keywords)?.split(',').map((keyword) => keyword.trim()).filter(Boolean)
  const keywords = product.seoFocusKeywords?.length
    ? product.seoFocusKeywords
    : text(fields.focuskw) ? [text(fields.focuskw)!] : importedKeywords
  const twitterCard = text(fields['twitter:card'])
  const openGraphImage = image
    ? {
        url: absoluteUrl(image),
        ...(Number.isFinite(imageWidth) && imageWidth > 0 ? { width: imageWidth } : {}),
        ...(Number.isFinite(imageHeight) && imageHeight > 0 ? { height: imageHeight } : {}),
        alt: title,
      }
    : undefined

  return {
    title: { absolute: title },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: text(fields['og:type']) === 'article' ? 'article' : 'website',
      locale: text(fields['og:locale']) ?? 'en_US',
      siteName: text(fields['og:site_name']) ?? 'ISK Lenses',
      title: text(product.seoTitle) ?? text(fields['og:title']) ?? title,
      description: text(product.seoDescription) ?? text(fields['og:description']) ?? description,
      url: canonical,
      ...(openGraphImage ? { images: [openGraphImage] } : {}),
    },
    twitter: {
      card: twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      title: text(product.seoTitle) ?? text(fields['twitter:title']) ?? title,
      description: text(product.seoDescription) ?? text(fields['twitter:description']) ?? description,
      ...(image ? { images: [absoluteUrl(text(fields['twitter:image']) ?? image)] } : {}),
    },
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ slug }, { option }] = await Promise.all([params, searchParams])
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound()
  const product = await getProduct(slug)
  if (!product) notFound()
  const [reviews, sections, settings, categories, seo] = await Promise.all([
    getApprovedReviews(product.id),
    getProductSections({ id: product.id, categoryId: product.categoryId }),
    getProductPageSettings(),
    getCategories(),
    getProductSeoMetadata(slug),
  ])
  const breadcrumbs = []
  let current = categories.find((item) => item.id === product.categoryId)
  while (current) {
    breadcrumbs.unshift({ name: current.name, path: current.path })
    current = current.parentId ? categories.find((item) => item.id === current!.parentId) : undefined
  }
  const serialize = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
  const schema = record(seo?.fields?.schema)
  const sourceGraph = Array.isArray(schema?.['@graph'])
    ? schema['@graph'].filter((item): item is Record<string, unknown> => record(item) !== null)
    : []
  const images = product.assets
    .filter((asset) => asset.mediaType === 'image' && Boolean(asset.blobUrl))
    .map((asset) => absoluteUrl(asset.blobUrl!))
  if (!images.length && product.heroImageUrl) images.push(absoluteUrl(product.heroImageUrl))
  const canonical = `https://isklenses.com/product/${product.slug}`
  const price = Number(product.price)
  const productSchema = {
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: product.name,
    ...(text(product.seoDescription) ?? text(seo?.description) ?? text(product.description)
      ? { description: text(product.seoDescription) ?? text(seo?.description) ?? text(product.description) }
      : {}),
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(Number.isFinite(price) && price >= 0
      ? {
          offers: {
            '@type': 'Offer',
            url: canonical,
            price: price.toFixed(2),
            priceCurrency: product.currency,
          },
        }
      : {}),
  }
  const structuredData = {
    '@context': text(schema?.['@context']) ?? 'https://schema.org',
    '@graph': [...sourceGraph, productSchema],
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c') }}
      />
      <StorefrontProductDetail
        initialProduct={serialize(product) as unknown as Product}
        initialOptionId={option}
        reviews={serialize(reviews) as unknown as Parameters<typeof StorefrontProductDetail>[0]["reviews"]}
        reviewSettings={settings.reviews}
        sections={serialize(sections) as unknown as { id: string; title: string; products: Product[] }[]}
        breadcrumbs={breadcrumbs}
      />
    </>
  )
}
