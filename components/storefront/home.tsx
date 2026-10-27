import Link from 'next/link'
import { ArrowRight, BookOpen, Compass, Eye, Headphones, ShoppingBag, Star, type LucideIcon } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import { SectionProgress } from '@/components/storefront/home/section-progress'
import { TrendingProducts } from '@/components/storefront/home/trending-products'
import { StoreFooter } from '@/components/storefront/shell/store-footer'
import { RuntimeErrorNotice } from '@/components/ui/app-notifications'
import type { BannerContent, HomeContent, SiteChrome } from '@/lib/content-types'
import type { CategoryNode } from '@/lib/catalog-types'
import {
  getCategories,
  getHomeCatalog,
  getStorefrontBrands,
  getStorefrontLensTypes,
  getStorefrontReviews,
  getStorefrontShades,
} from '@/lib/data/catalog'
import { getHomeContent } from '@/lib/data/site-content'
import type { Product } from '@/lib/hooks/use-storefront-data'
import { categoryHref } from '@/lib/store-config'

function Img({ src, alt, className, priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className={className} />
}

function Heading({
  eyebrow,
  first,
  accent,
  description,
  href,
  hrefLabel,
  inverse = false,
  id,
}: {
  eyebrow?: string
  first: string
  accent?: string
  description?: string
  href?: string
  hrefLabel?: string
  inverse?: boolean
  id?: string
}) {
  return (
    <div className={`flex flex-col gap-5 md:flex-row md:items-end md:justify-between ${inverse ? 'text-white' : 'text-[#201b35]'}`}>
      <div className="max-w-3xl">
        {eyebrow && <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.22em] ${inverse ? 'text-[#f3b4c9]' : 'text-[#b83f6b]'}`}>{eyebrow}</p>}
        <h2 id={id} className="text-balance text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
          {first}
          {accent && <span className="ml-2 font-serif font-normal italic text-[#d45782]">{` ${accent}`}</span>}
        </h2>
        {description && <p className={`mt-4 max-w-2xl text-base leading-7 sm:text-lg ${inverse ? 'text-white/75' : 'text-[#686371]'}`}>{description}</p>}
      </div>
      {href && (
        <Link href={href} className={`inline-flex shrink-0 items-center gap-2 text-sm font-semibold transition ${inverse ? 'text-[#f3b4c9] hover:text-white' : 'text-[#201b35] hover:text-[#b83f6b]'}`}>
          {hrefLabel ?? 'Browse all'} <ArrowRight size={17} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function brandWordmarkClass(name: string) {
  const brand = name.toLowerCase()
  if (['bella', 'dahab', 'solotica', 'lenseme', 'victoria'].includes(brand)) return 'font-serif font-normal italic'
  if (['hydrocor', 'desio', 'anesthesia'].includes(brand)) return 'font-medium uppercase tracking-[0.1em]'
  return 'font-extrabold tracking-[-0.035em]'
}

const storeFeatures: { title: string; body: string; icon: LucideIcon }[] = [
  { title: 'Browse collections', body: 'Explore listings by brand, shade, and lens type.', icon: Compass },
  { title: 'Review product details', body: 'Compare the information shown on each listing.', icon: BookOpen },
  { title: 'Explore color options', body: 'Use the gallery as a guide, then check listing photos.', icon: Eye },
  { title: 'Manage your basket', body: 'Keep selected catalog items together as you browse.', icon: ShoppingBag },
  { title: 'Ask the store', body: 'Contact the team with questions about an order or listing.', icon: Headphones },
  { title: 'Follow professional guidance', body: 'Consult an eye-care professional about lens fit and suitability.', icon: Eye },
]

type HomeData = {
  content: HomeContent | null
  products: Product[]
  categories: CategoryNode[]
  brands: Awaited<ReturnType<typeof getStorefrontBrands>>
  shades: Awaited<ReturnType<typeof getStorefrontShades>>
  lensTypes: Awaited<ReturnType<typeof getStorefrontLensTypes>>
  reviews: Awaited<ReturnType<typeof getStorefrontReviews>>
  loadError?: string
}

async function loadHome(): Promise<HomeData> {
  const [content, catalog, categories, brands, shades, lensTypes, reviews] = await Promise.allSettled([
    getHomeContent(),
    getHomeCatalog(),
    getCategories(),
    getStorefrontBrands(),
    getStorefrontShades(),
    getStorefrontLensTypes(),
    getStorefrontReviews(),
  ])
  const failed = [
    ['Homepage content could not be loaded.', content],
    ['The product catalog could not be loaded.', catalog],
    ['Product categories could not be loaded.', categories],
    ['Product brands could not be loaded.', brands],
    ['Lens shades could not be loaded.', shades],
    ['Lens types could not be loaded.', lensTypes],
    ['Approved product reviews could not be loaded.', reviews],
  ] as const
  for (const [, result] of failed) {
    if (result.status === 'rejected') console.error('[home] Database content unavailable', result.reason instanceof Error ? result.reason.name : 'UnknownError')
  }
  const errors = failed.filter(([, result]) => result.status === 'rejected').map(([message]) => message)
  return {
    content: content.status === 'fulfilled' ? content.value : null,
    products: catalog.status === 'fulfilled'
      ? catalog.value as unknown as Product[]
      : [],
    categories: categories.status === 'fulfilled' ? categories.value : [],
    brands: brands.status === 'fulfilled' ? brands.value : [],
    shades: shades.status === 'fulfilled' ? shades.value : [],
    lensTypes: lensTypes.status === 'fulfilled' ? lensTypes.value : [],
    reviews: reviews.status === 'fulfilled' ? reviews.value : [],
    loadError: errors.join(' '),
  }
}

function Hero({ slides }: { slides: BannerContent[] }) {
  return (
    <section id="hero" aria-label="Featured lens collections" className="isk-home-section relative h-full min-h-full snap-start snap-always">
      {slides.length > 0 ? (
        <Slider label="Featured lens collections" autoPlayMs={5500} dots arrows editorialControls fullHeight>
          {slides.map((slide, index) => (
            <div key={slide.id} className="relative h-full min-h-full overflow-hidden bg-[#15384d]">
              <Img src={slide.imageUrl} alt={slide.title || 'ISK Lenses collection'} priority={index === 0} className="absolute inset-0 size-full object-cover object-[68%_center]" />
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,56,77,.94)_0%,rgba(21,56,77,.72)_42%,rgba(21,56,77,.08)_100%)]" />
              <div className="relative mx-auto flex h-full min-h-full w-full min-w-0 max-w-[1440px] items-center px-5 pb-28 pt-12 sm:px-10 lg:px-12">
                <div className="w-full min-w-0 max-w-[650px] text-white">
                  <h1 className="text-balance text-[clamp(2.6rem,7.6vw,6rem)] font-extrabold leading-[0.94] tracking-[-0.055em]">
                    {slide.title || 'ISK Lenses'}
                  </h1>
                  {slide.body && <p className="mt-6 w-full min-w-0 max-w-xl text-lg leading-8 text-white/85 sm:text-xl">{slide.body}</p>}
                  <Link href={slide.href || '/shop'} className="group mt-8 inline-flex min-h-14 items-center gap-3 rounded-full bg-[#087ba5] px-7 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#006f9b]">
                    {slide.href?.startsWith('/product/') ? 'View product' : 'Browse collection'}
                    <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      ) : (
        <div className="flex h-full items-center justify-center bg-[#e8f6fb] px-6 text-center">
          <div>
            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.055em] text-[#15384d] sm:text-6xl">ISK Lenses</h1>
            <p className="mt-4 text-[#526b7b]">No featured collections are available right now.</p>
            <Link href="/shop" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#006f9b] px-6 font-semibold text-white">Browse the catalog</Link>
          </div>
        </div>
      )}
    </section>
  )
}

function productImage(product: Product | undefined) {
  return product?.heroImageUrl ?? product?.assets?.find((asset) => asset.mediaType === 'image')?.blobUrl ?? null
}

export async function Home({ chrome }: { chrome: SiteChrome }) {
  const { content, products, categories, brands, shades, lensTypes, reviews, loadError } = await loadHome()
  const banners = (placement: BannerContent['placement']) => content?.banners.filter((banner) => banner.placement === placement) ?? []
  const h = content?.headings ?? {}
  const heroBanners = banners('hero')
  const heroSlides: BannerContent[] = heroBanners.length > 0
    ? heroBanners
    : products
      .filter((product) => productImage(product))
      .slice(0, 4)
      .map((product, index) => ({
        id: `catalog-${product.id}`,
        placement: 'hero',
        title: product.name,
        body: product.shortDescription || product.description,
        imageUrl: productImage(product)!,
        href: `/product/${product.slug}`,
        sortOrder: index,
        isActive: true,
      }))
  const brandLogos = new Map(brands.flatMap((brand) => brand.logoUrl
    ? [[brand.name.trim().toLocaleLowerCase(), brand.logoUrl] as const]
    : []))
  const categoryCards = categories
    .filter((category) => category.productCount > 0)
    .slice(0, 5)
    .map((category) => {
      const product = products.find((item) => item.categoryPath === category.path || item.categoryPath?.startsWith(`${category.path}/`))
      return { category, image: category.imageUrl ?? productImage(product) }
    })
  const shadeCards = shades.map((shade) => ({
    shade,
    product: products.find((product) => product.lensShadeId === shade.id),
  }))
  const contactProduct = products.find((product) => productImage(product))
  const contactImage = productImage(contactProduct)
  return (
    <main id="isk-home-scroll" tabIndex={0} aria-label="Homepage sections, scroll to explore" className="isk-home snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth bg-[#fffaf8] text-[#201b35]">
      <RuntimeErrorNotice message={loadError} />
      <Hero slides={heroSlides} />
      <SectionProgress />

      <section id="bloom" aria-labelledby="bloom-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#e8f6fb] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:grid-cols-[.85fr_1.4fr] lg:gap-10 lg:px-12">
          <div>
            <h2 id="bloom-heading" className="mt-8 max-w-xl text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] sm:text-6xl">
              {h.categories ?? 'Browse'}<br /><em className="font-serif font-normal text-[#087ba5]">collections.</em>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#526b7b]">{h.categoriesIntro ?? 'Shop active product categories from the ISK Lenses catalog.'}</p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Link href="/shop" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#006f9b] px-6 text-sm font-bold text-white transition hover:bg-[#087ba5]">
                Browse the catalog <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <span className="text-sm font-semibold text-[#526b7b]">{categoryCards.length} available {categoryCards.length === 1 ? 'category' : 'categories'}</span>
            </div>
          </div>
          {categoryCards.length > 0 ? (
            <ul className="grid grid-cols-2 items-center gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {categoryCards.map(({ category, image }, index) => (
                <li key={category.id} className={index % 2 ? 'lg:translate-y-12' : ''}>
                  <Link href={categoryHref(category)} className="group block text-center">
                    <span className="relative block overflow-hidden rounded-[50%] bg-[#cfe2eb]">
                      {image ? (
                        <Img src={image} alt={category.name} className="aspect-[.68/1] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                      ) : (
                        <span className="grid aspect-[.68/1] w-full place-items-center text-[#087ba5]"><Eye size={32} aria-hidden="true" /></span>
                      )}
                    </span>
                    <span className="mt-3 block text-base font-bold text-[#15384d]">{category.name}</span>
                    <span className="mt-1 block text-xs text-[#526b7b]">{category.productCount} active {category.productCount === 1 ? 'listing' : 'listings'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-[#cfe2eb] bg-white/70 p-6 text-sm text-[#526b7b]">No product categories with active listings are available yet.</p>
          )}
        </div>
      </section>

      <section id="brands" aria-labelledby="brands-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fffaf8] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <Heading
            id="brands-heading"
            eyebrow="International brands"
            first="Shop by"
            accent="brand"
            description={brands.length > 0 ? 'Browse brands attached to active product listings.' : undefined}
            href="/shop"
            hrefLabel="View all brands"
          />
          {brands.length > 0 ? (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              {brands.slice(0, 12).map((brand) => {
                const logo = brand.logoUrl ?? brandLogos.get(brand.name.trim().toLocaleLowerCase())
                return (
                  <li key={brand.id}>
                    <Link href={`/shop?q=${encodeURIComponent(brand.name)}`} className="group flex min-h-28 flex-col justify-center rounded-3xl border border-[#cfe2eb] bg-white px-4 py-3 transition-colors hover:border-[#087ba5] sm:min-h-32">
                      {logo
                        ? <Img src={logo} alt={`${brand.name} logo`} className="h-12 w-full object-contain" />
                        : <span className={`text-lg text-[#15384d] group-hover:text-[#006f9b] ${brandWordmarkClass(brand.name)}`}>{brand.name}</span>}
                      <span className="mt-2 text-xs text-[#526b7b]">{brand.productCount} active {brand.productCount === 1 ? 'listing' : 'listings'}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-8 rounded-2xl border border-[#cfe2eb] bg-white p-6 text-sm text-[#526b7b]">No active catalog products are linked to a brand yet.</p>
          )}
        </div>
      </section>

      <section id="shades" aria-labelledby="shades-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#f7fcff] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <Heading
            id="shades-heading"
            eyebrow="Find your color"
            first="Shop by"
            accent="shade"
            description={shadeCards.length > 0 ? 'Each shade is linked to an active product listing.' : undefined}
            href="/shop"
            hrefLabel="Browse all shades"
          />
          {shadeCards.length > 0 ? (
            <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
              {shadeCards.slice(0, 12).map(({ shade, product }) => {
                const image = shade.imageUrl ?? productImage(product)
                const swatch = shade.hex && /^#[\da-f]{6}$/i.test(shade.hex) ? shade.hex : null
                return (
                  <li key={shade.id}>
                    <Link href={`/shop?q=${encodeURIComponent(shade.name)}`} className="group block text-center">
                      <span className="block overflow-hidden rounded-full border-[5px] border-white bg-[#e8f6fb]">
                        {image
                          ? <Img src={image} alt={`${shade.name} lens listing`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                          : <span className="grid aspect-square w-full place-items-center"><span aria-hidden="true" className="size-12 rounded-full border border-[#cfe2eb]" style={{ backgroundColor: swatch ?? '#e8f6fb' }} /></span>}
                      </span>
                      <span className="mt-4 flex items-center justify-center gap-2 text-base font-bold text-[#15384d] sm:text-lg">
                        {swatch && <span aria-hidden="true" className="size-3 rounded-full ring-2 ring-white" style={{ backgroundColor: swatch }} />}
                        {shade.name}
                      </span>
                      <span className="mt-1 block text-sm text-[#526b7b]">{shade.productCount} active {shade.productCount === 1 ? 'listing' : 'listings'}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-8 rounded-2xl border border-[#cfe2eb] bg-white p-6 text-sm text-[#526b7b]">No active products are linked to lens shades yet.</p>
          )}
        </div>
      </section>

      <section id="trending" aria-label="Catalog listings" className="isk-home-section min-h-full snap-start snap-always bg-white py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <div className="mb-8">
            <Heading
              id="trending-heading"
              first="Browse"
              accent="the catalog"
              description={products.length > 0 ? 'Product details and prices are read from active catalog listings.' : undefined}
              href="/shop"
              hrefLabel="Shop all lenses"
            />
          </div>
          <TrendingProducts products={products} />
        </div>
      </section>

      <section id="types" aria-labelledby="types-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fae9ef] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 sm:px-8 lg:grid-cols-[.8fr_1.3fr] lg:items-center lg:gap-16 lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b83f6b]">Wear it your way</p>
            <h2 id="types-heading" className="mt-5 text-5xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
              Shop by<br /><em className="font-serif font-normal text-[#e84f88]">lens type.</em>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-[#686371]">Browse the catalog by the kind of lens you are looking for, then review each listing for its available details.</p>
            <Link href="/faq" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#201b35] hover:text-[#b83f6b]">
              Need help choosing? <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          {lensTypes.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-5 sm:grid-cols-3">
              {lensTypes.map((lensType) => (
                <li key={lensType.id}>
                  {lensType.productCount > 0 ? (
                    <Link href={`/shop?q=${encodeURIComponent(lensType.name)}`} className="group flex min-h-28 items-center justify-between gap-3 border-t border-[#15384d]/20 py-4 transition-colors hover:border-[#087ba5] sm:min-h-32">
                      <span>
                        <span className="block text-base font-bold tracking-[-0.035em] text-[#15384d] sm:text-lg">{lensType.name}</span>
                        <span className="mt-1 block text-xs text-[#526b7b] sm:text-sm">{lensType.productCount} active {lensType.productCount === 1 ? 'listing' : 'listings'}</span>
                      </span>
                      <ArrowRight size={18} className="shrink-0 text-[#087ba5] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  ) : (
                    <div className="flex min-h-28 items-center justify-between gap-3 border-t border-[#15384d]/20 py-4 sm:min-h-32">
                      <span>
                        <span className="block text-base font-bold tracking-[-0.035em] text-[#15384d] sm:text-lg">{lensType.name}</span>
                        <span className="mt-1 block text-xs text-[#526b7b] sm:text-sm">No active listings linked yet</span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-[#cfe2eb] bg-white/70 p-6 text-sm text-[#526b7b]">No lens types are available yet.</p>
          )}
        </div>
      </section>

      <section id="why-us" aria-labelledby="why-us-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#201b35] py-8 text-white sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 sm:px-8 lg:grid-cols-[.8fr_1.3fr] lg:gap-16 lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f3b4c9]">ISK Lenses</p>
            <h2 id="why-us-heading" className="mt-5 max-w-xl text-5xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
              Browse with<br /><em className="font-serif font-normal text-[#f3b4c9]">confidence.</em>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-white/75">
              Compare catalog listings and review their product details. Contact lenses are medical devices; follow the guidance of your eye-care professional.
            </p>
            <Link href="/faq" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#e84f88] px-6 text-sm font-semibold text-white transition hover:bg-white hover:text-[#201b35]">
              Read lens guidance <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2">
            {storeFeatures.map(({ title, body, icon: FeatureIcon }) => {
              return (
                <li key={title} className="flex gap-4 bg-[#201b35] p-4 transition-colors hover:bg-white/5 sm:p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-[#f3b4c9]"><FeatureIcon size={19} aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/70">{body}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section id="reviews" aria-labelledby="reviews-heading" className="isk-home-section min-h-full snap-start snap-always overflow-hidden bg-[#fae9ef] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <Heading
            id="reviews-heading"
            first={h.reviews ?? 'Product'}
            accent={h.reviews ? undefined : 'reviews'}
            description={reviews.length > 0 ? h.reviewsIntro : undefined}
          />
          {reviews.length > 0 ? (
            <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
              {reviews.map((review) => (
                <figure key={review.id} className="flex min-h-56 w-[min(84vw,440px)] shrink-0 snap-start flex-col rounded-[2rem] border border-[#cfe2eb] bg-white p-5 sm:w-[440px] sm:p-6">
                  {review.title && <h3 className="font-semibold text-[#15384d]">{review.title}</h3>}
                  <blockquote className="mt-4 flex-1 text-lg leading-8 text-[#15384d] sm:text-xl">“{review.body}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-[#cfe2eb] pt-4 text-sm font-semibold text-[#526b7b]">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e8f6fb] font-bold text-[#006f9b]">{review.author.slice(0, 1)}</span>
                    <span className="min-w-0 flex-1 truncate">{review.author}</span>
                    <span className="inline-flex shrink-0 items-center gap-1"><Star size={14} className="fill-[#b66b24] text-[#b66b24]" aria-hidden="true" />{review.rating}/5</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-[#cfe2eb] bg-white p-6 text-sm text-[#526b7b]">No approved product reviews have been published yet.</p>
          )}
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-heading" className="isk-home-contact-section isk-home-section min-h-full snap-start snap-always bg-[#fffaf8] pt-8 sm:pt-10 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 sm:px-8 lg:px-12">
          <div className="isk-home-contact-card relative grid min-h-[390px] flex-1 items-center gap-2 overflow-hidden rounded-[2rem] bg-[#d45782] md:grid-cols-[1.3fr_1fr]">
            <div className="isk-home-contact-copy relative z-10 p-6 sm:p-9 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">ISK Lenses · Contact</p>
              <h2 id="contact-heading" className="isk-home-contact-heading mt-4 max-w-2xl text-4xl font-extrabold leading-[0.96] tracking-[-0.055em] text-white sm:text-5xl">
                {h.serviceTitle ?? 'Not sure which shade suits you?'}{!h.serviceTitle && <><br /><em className="font-serif font-normal text-white">Ask our team.</em></>}
              </h2>
              <p className="isk-home-contact-body mt-4 max-w-xl text-base leading-7 text-white/90">
                {h.serviceBody ?? 'Contact the ISK Lenses team with questions about the catalog or an order. For lens suitability and fit, consult your eye-care professional.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact-us" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#201b35] px-6 text-sm font-bold text-white transition hover:bg-white hover:text-[#201b35]">
                  Contact the store <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="relative z-10 flex min-h-[260px] items-center justify-center px-6 pb-6 md:min-h-0 md:px-8 md:py-10">
              {contactProduct && contactImage
                ? <Img src={contactImage} alt={contactProduct.name} className="isk-home-contact-portrait aspect-[1.05/1] w-full max-w-[400px] rounded-[50%] object-cover" />
                : <div aria-hidden="true" className="grid aspect-square w-full max-w-[320px] place-items-center rounded-full bg-white/15 text-white"><Eye size={64} strokeWidth={1.2} /></div>}
            </div>
          </div>
          <StoreFooter chrome={chrome} homepage brands={brands} categories={categories} />
        </div>
      </section>

    </main>
  )
}
