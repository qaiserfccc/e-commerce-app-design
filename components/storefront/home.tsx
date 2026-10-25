import Link from 'next/link'
import { ArrowRight, BookOpen, Compass, Eye, Headphones, ShoppingBag, type LucideIcon } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import { SectionProgress } from '@/components/storefront/home/section-progress'
import { TrendingProducts } from '@/components/storefront/home/trending-products'
import { StoreFooter } from '@/components/storefront/shell/store-footer'
import { getProductImageSources } from '@/lib/storefront/product-image-sources'
import type { BannerContent, HomeContent, SiteChrome } from '@/lib/content-types'
import { getCatalog } from '@/lib/data/catalog'
import { getHomeContent } from '@/lib/data/site-content'
import type { Product } from '@/lib/hooks/use-storefront-data'

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

const demoSlides = [
  {
    image: '/isk-home/banner-featured.webp',
    alt: 'Illustrative contact lens packaging and case on a stone pedestal',
    label: 'FEATURED COLLECTION',
    title: 'Bella Elite',
    accent: 'Glow Collection',
    body: 'Explore the ISK Lenses catalog and compare the information listed with each product.',
    action: 'Explore Bella lenses',
    href: '/shop?q=Bella',
    tone: 'light',
  },
  {
    image: '/isk-home/banner-deals.webp',
    alt: 'Illustrative portrait artwork for colored contact lenses',
    label: 'COLOR COLLECTION',
    title: 'Find a shade',
    accent: 'that feels like you.',
    body: 'Browse lens listings by color, brand, and the details that matter to you.',
    action: 'Browse the catalog',
    href: '/shop',
    tone: 'light',
  },
  {
    image: '/isk-home/banner-news.webp',
    alt: 'Illustrative portrait with green-colored contact lenses',
    label: 'EXPLORE THE CATALOG',
    title: 'A different look',
    accent: 'starts here.',
    body: 'Explore available listings and follow your eye-care professional’s guidance when choosing lenses.',
    action: 'How to choose',
    href: '/faq',
    tone: 'dark',
  },
] as const

const demoMoods = [
  { name: 'Honey', image: '/isk-home/mood-honey.webp' },
  { name: 'Mist', image: '/isk-home/mood-gray.webp' },
  { name: 'Ocean', image: '/isk-home/mood-blue.webp' },
  { name: 'Hazel', image: '/isk-home/mood-hazel.webp' },
  { name: 'Matcha', image: '/isk-home/mood-green.webp' },
]

const demoShades = [
  { name: 'Gray', image: '/isk-home/eye-gray.webp' },
  { name: 'Hazel', image: '/isk-home/eye-hazel.webp' },
  { name: 'Brown', image: '/isk-home/eye-brown.webp' },
  { name: 'Green', image: '/isk-home/eye-green.webp' },
  { name: 'Blue', image: '/isk-home/eye-blue.webp' },
  { name: 'Violet', image: '/isk-home/eye-violet.webp' },
]

const demoBrands = ['Bella', 'Hydrocor', 'Dahab', 'FreshLook', 'Solotica', 'Desio', 'Anesthesia', 'Lenseme', 'Acuvue', 'Bausch+Lomb', 'Air Optix', 'Victoria']

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

async function loadHome(): Promise<{ content: HomeContent | null; products: Product[] }> {
  const [content, catalog] = await Promise.allSettled([getHomeContent(), getCatalog()])
  if (content.status === 'rejected') console.error('[home] Content unavailable', content.reason instanceof Error ? content.reason.name : 'UnknownError')
  if (catalog.status === 'rejected') console.error('[home] Catalog unavailable', catalog.reason instanceof Error ? catalog.reason.name : 'UnknownError')
  return {
    content: content.status === 'fulfilled' ? content.value : null,
    products: catalog.status === 'fulfilled' ? (catalog.value.slice(0, 12) as unknown as Product[]) : [],
  }
}

function Hero({ banners }: { banners: BannerContent[] }) {
  const slides = banners.length > 0 ? banners : demoSlides
  return (
    <section id="hero" aria-label="Featured lens collections" className="isk-home-section relative h-full min-h-full snap-start snap-always">
      <Slider label="Featured lens collections" autoPlayMs={5500} dots arrows editorialControls fullHeight>
        {slides.map((slide, index) => {
          const demo = 'label' in slide
          const image = demo ? slide.image : slide.imageUrl
          const alt = demo ? slide.alt : slide.title
          const title = demo ? slide.title : slide.title
          const accent = demo ? slide.accent : undefined
          const body = slide.body
          const href = slide.href ?? '/shop'
          const dark = demo && slide.tone === 'dark'
          return (
            <div key={demo ? slide.image : slide.id} className="relative h-full min-h-full overflow-hidden bg-[#f7e8ed]">
              <Img
                src={image}
                alt={alt}
                priority={index === 0}
                className="absolute inset-0 size-full object-cover object-[68%_center]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background: dark
                    ? 'linear-gradient(90deg, rgba(32,27,53,.96) 0%, rgba(32,27,53,.80) 40%, rgba(32,27,53,.05) 100%)'
                    : 'linear-gradient(90deg, rgba(255,250,248,.98) 0%, rgba(255,250,248,.88) 36%, rgba(255,250,248,.12) 76%, rgba(255,250,248,0) 100%)',
                }}
              />
              <div className="relative mx-auto flex h-full min-h-full max-w-[1440px] items-center px-5 pb-28 pt-12 sm:px-10 lg:px-12">
                <div className={`max-w-[650px] ${dark ? 'text-white' : 'text-[#201b35]'}`}>
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] ${dark ? 'bg-white/15 text-white' : 'bg-[#fae9ef] text-[#b83f6b]'}`}>
                    <span className="size-2 rounded-full bg-[#d45782]" aria-hidden="true" />
                    {demo ? slide.label : 'FEATURED COLLECTION'}
                  </span>
                  <h1 className="mt-7 text-balance text-[clamp(3.5rem,7.6vw,7rem)] font-extrabold leading-[0.91] tracking-[-0.065em]">
                    {title}
                    {accent && <span className={`mt-2 block font-serif text-[.76em] font-normal italic leading-[1.02] tracking-[-0.04em] ${dark ? 'text-[#f3b4c9]' : 'text-[#e84f88]'}`}>{accent}</span>}
                  </h1>
                  {body && <p className={`mt-6 max-w-xl text-lg leading-8 sm:text-xl ${dark ? 'text-white/85' : 'text-[#686371]'}`}>{body}</p>}
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link href={href} className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-[#b83f6b] px-7 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#201b35]">
                      {demo ? slide.action : 'Explore this collection'}
                      <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} aria-hidden="true" />
                    </Link>
                    <Link href="#brands" className={`inline-flex min-h-14 items-center rounded-full border px-7 text-sm font-bold transition ${dark ? 'border-white/35 text-white hover:bg-white/10' : 'border-[#201b35]/25 text-[#201b35] hover:bg-white/70'}`}>
                      Compare options
                    </Link>
                  </div>
                  {demo && <p className={`mt-5 text-xs ${dark ? 'text-white/75' : 'text-[#686371]'}`}>Illustrative campaign image · sample homepage content</p>}
                </div>
              </div>
            </div>
          )
        })}
      </Slider>
    </section>
  )
}

function SampleNotice() {
  return <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#201b35]">Sample image</span>
}

export async function Home({ chrome }: { chrome: SiteChrome }) {
  const { content, products } = await loadHome()
  const banners = (placement: BannerContent['placement']) => content?.banners.filter((banner) => banner.placement === placement) ?? []
  const h = content?.headings ?? {}
  const heroBanners = banners('hero')
  const moodBanners = banners('promo')
  const brandBanners = banners('brand')
  const whyBanners = banners('why_choose')
  const serviceBanners = banners('service')
  const brandNames = [...new Set(products.map((product) => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))]
  const hasRealProducts = products.length > 0
  const hasRealReviews = Boolean(content?.reviews.length)
  const reviews = content?.reviews ?? []
  const reviewCards = hasRealReviews ? reviews.slice(0, 8) : [
    { id: 'sample-1', body: 'Sample feedback will appear here after it has been reviewed.', author: 'Preview content' },
    { id: 'sample-2', body: 'Customer notes can be added here when verified.', author: 'Preview content' },
    { id: 'sample-3', body: 'Use this space for genuine feedback from shoppers.', author: 'Preview content' },
    { id: 'sample-4', body: 'Reviews are not included in this design preview.', author: 'Preview content' },
  ]
  const contactImage = products[0] ? getProductImageSources(products[0])[0] : undefined

  return (
    <main id="isk-home-scroll" tabIndex={0} aria-label="Homepage sections, scroll to explore" className="isk-home snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth bg-[#fffaf8] text-[#201b35]">
      <Hero banners={heroBanners} />
      <SectionProgress />

      <section id="bloom" aria-labelledby="bloom-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fbefe5] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:grid-cols-[.85fr_1.4fr] lg:gap-10 lg:px-12">
          <div>
            <p className="font-extrabold text-[#d45782]"><span className="text-5xl leading-none tracking-[-0.08em] sm:text-6xl">bloom</span><span className="ml-2 align-top text-xs font-bold uppercase tracking-[0.12em] text-[#686371]">color lenses</span></p>
            <h2 id="bloom-heading" className="mt-8 max-w-xl text-5xl font-extrabold leading-[0.94] tracking-[-0.06em] sm:text-6xl">
              Pick a shade.<br />Own the mood.
            </h2>
            <p className="mt-5 font-serif text-2xl italic leading-snug text-[#686371] sm:text-3xl">Five shades.<br />One unforgettable gaze.</p>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#686371]">Explore sample color directions. These images are illustrative; product options and appearance vary by listing.</p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Link href="/shop" className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#d45782] px-6 text-sm font-bold text-white transition hover:bg-[#b83f6b]">
                Explore color lenses <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <span className="text-sm font-semibold text-[#686371]">Sample gallery</span>
            </div>
          </div>
          <ul className="grid grid-cols-2 items-center gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {demoMoods.map((mood, index) => {
              const banner = moodBanners[index]
              const image = banner?.imageUrl ?? mood.image
              return (
                <li key={banner?.id ?? mood.name} className={index % 2 ? 'lg:translate-y-12' : ''}>
                  <Link href={banner?.href ?? `/shop?q=${encodeURIComponent(mood.name)}`} className="group block text-center">
                    <span className="relative block overflow-hidden rounded-[50%] bg-[#e9d8cf]">
                      <Img src={image} alt={banner?.title ?? `Sample ${mood.name.toLowerCase()} lens look`} className="aspect-[.68/1] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                    </span>
                    <span className={`mt-3 block text-base font-bold ${index === 0 ? 'text-[#d45782]' : 'text-[#201b35]'}`}>{banner?.title ?? mood.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section id="brands" aria-labelledby="brands-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fae9ef] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <Heading
            id="brands-heading"
            eyebrow="International brands"
            first="Shop by"
            accent="brand"
            description={hasRealProducts ? 'Browse the brand names shown in the current catalog.' : 'Sample brand names for this design preview.'}
            href="/shop"
            hrefLabel="View all brands"
          />
          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {brandBanners.length > 0 ? brandBanners.slice(0, 12).map((brand) => (
              <li key={brand.id}>
                <Link href={brand.href ?? `/shop?q=${encodeURIComponent(brand.title)}`} className="group flex min-h-28 flex-col justify-center rounded-3xl border border-[#201b35]/10 bg-[#fffaf8]/65 px-4 py-3 transition-colors hover:border-[#d45782] hover:bg-white sm:min-h-32">
                  <Img src={brand.imageUrl} alt="" className="mb-2 h-8 max-w-32 object-contain object-left" />
                  <span className={`text-lg text-[#201b35] group-hover:text-[#b83f6b] ${brandWordmarkClass(brand.title)}`}>{brand.title}</span>
                  {brand.body && <span className="mt-1 line-clamp-1 text-xs text-[#686371]">{brand.body}</span>}
                </Link>
              </li>
            )) : (brandNames.length ? brandNames : demoBrands).slice(0, 12).map((brand) => (
              <li key={brand}>
                <Link href={`/shop?q=${encodeURIComponent(brand)}`} className="group flex min-h-28 flex-col justify-center rounded-3xl border border-[#201b35]/10 bg-[#fffaf8]/65 px-4 py-3 transition-colors hover:border-[#d45782] hover:bg-white sm:min-h-32">
                  <span className={`text-lg text-[#201b35] group-hover:text-[#b83f6b] ${brandWordmarkClass(brand)}`}>{brand}</span>
                  <span className="mt-1 text-xs text-[#686371]">Browse listings</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="shades" aria-labelledby="shades-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fffaf8] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <Heading
            id="shades-heading"
            eyebrow="Find your color"
            first="Shop by"
            accent="shade"
            description="Sample eye images are illustrative; check each product listing for its actual photos and details."
            href="/shop"
            hrefLabel="Browse all shades"
          />
          <ul className="mt-8 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
            {demoShades.map((shade) => (
              <li key={shade.name}>
                <Link href={`/shop?q=${encodeURIComponent(shade.name)}`} className="group block text-center">
                  <span className="relative block overflow-hidden rounded-full bg-[#fae9ef]">
                    <Img src={shade.image} alt={`Illustrative ${shade.name.toLowerCase()} eye image`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/95 px-2 py-1.5 text-center text-xs font-semibold text-[#201b35] sm:inset-x-3 sm:bottom-3 sm:py-2 sm:text-sm">{shade.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {['Natural look', 'Bridal', 'Party & dramatic', 'Dark eyes', 'Daily office', 'Cosplay'].map((tag) => (
              <li key={tag}><Link href={`/shop?q=${encodeURIComponent(tag)}`} className="inline-flex rounded-full border border-[#e6dce1] px-4 py-2 text-sm font-medium text-[#686371] transition hover:border-[#d45782] hover:text-[#201b35]">{tag}</Link></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="trending" aria-label="Trending lens listings" className="isk-home-section min-h-full snap-start snap-always bg-white py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <div className="mb-8">
            <Heading
              eyebrow="Explore the catalog"
              id="trending-heading"
              first="Trending"
              accent="right now"
              description={hasRealProducts ? undefined : 'Sample product cards show the layout only. The live catalog supplies product names, prices, and availability.'}
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
          <ul className="grid grid-cols-2 gap-x-5 sm:grid-cols-3">
            {[
              ['Colored lenses', 'Explore color listings', 'colored'],
              ['Transparent', 'Browse clear lens listings', 'transparent'],
              ['Toric', 'Browse toric listings', 'toric'],
              ['Daily wear', 'Check product wear details', 'daily'],
              ['Monthly wear', 'Check product wear details', 'monthly'],
              ['Solutions & care', 'Browse care information', 'solutions'],
            ].map(([title, body, query], index) => (
              <li key={title} className={index === 0 ? 'col-span-2 sm:col-span-1 sm:row-span-2' : ''}>
                {index === 0 ? (
                  <Link href={`/shop?q=${encodeURIComponent(query)}`} className="group relative flex min-h-64 h-full flex-col justify-end overflow-hidden rounded-3xl bg-[#201b35] p-6 text-white sm:min-h-0">
                    <Img src="/isk-home/mood-hazel.webp" alt="" className="absolute inset-0 size-full object-cover opacity-55 transition duration-500 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-[#201b35] via-[#201b35]/20 to-transparent" />
                    <span className="relative text-xs font-bold uppercase tracking-[0.16em] text-[#f3b4c9]">Featured category</span>
                    <span className="relative mt-2 text-2xl font-bold">{title}</span>
                    <span className="relative mt-1 text-sm text-white/85">{body}</span>
                    <span className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold">Browse listings <ArrowRight size={16} aria-hidden="true" /></span>
                  </Link>
                ) : (
                  <Link href={`/shop?q=${encodeURIComponent(query)}`} className="group flex min-h-28 items-center justify-between gap-3 border-t border-[#201b35]/20 py-4 transition-colors hover:border-[#b83f6b] sm:min-h-32">
                    <span>
                      <span className="block text-base font-bold tracking-[-0.035em] text-[#201b35] sm:text-lg">{title}</span>
                      <span className="mt-1 block text-xs text-[#686371] sm:text-sm">{body}</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-[#b83f6b] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
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
            {whyBanners.map((item) => (
              <li key={item.id} className="flex gap-4 bg-[#201b35] p-4 sm:p-5">
                <Img src={item.imageUrl} alt="" className="size-12 shrink-0 object-contain" />
                <div><h3 className="font-semibold text-white">{item.title}</h3>{item.body && <p className="mt-1 text-sm leading-6 text-white/70">{item.body}</p>}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="reviews" aria-labelledby="reviews-heading" className="isk-home-section min-h-full snap-start snap-always overflow-hidden bg-[#fae9ef] py-8 sm:py-10 lg:flex lg:items-center">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <Heading
            id="reviews-heading"
            eyebrow="Customer notes"
            first={h.reviews ?? 'Words from'}
            accent={h.reviews ? undefined : 'the community'}
            description={h.reviewsIntro ?? (hasRealReviews ? undefined : 'Sample cards show where customer feedback can appear. They are not real reviews.')}
          />
          <div className="mt-8 space-y-4">
            {[0, 1].map((row) => (
              <div key={row} className="isk-review-track group flex w-max gap-4 py-1" dir={row ? 'rtl' : 'ltr'}>
                {[...reviewCards, ...reviewCards].map((review, index) => (
                  <figure key={`${row}-${review.id}-${index}`} dir="ltr" className="flex w-[min(78vw,360px)] flex-col justify-between rounded-2xl bg-[#fffaf8] p-5 sm:w-[360px] sm:p-6">
                    {!hasRealReviews && <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#b83f6b]">Sample content</span>}
                    <blockquote className="mt-3 font-serif text-xl leading-snug text-[#201b35] sm:text-2xl">“{review.body}”</blockquote>
                    <figcaption className="mt-5 text-sm font-semibold text-[#686371]">{hasRealReviews ? review.author : 'Preview card · not a customer review'}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fffaf8] pt-8 sm:pt-10 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col px-4 sm:px-8 lg:px-12">
          <div className="relative grid flex-1 items-center overflow-hidden rounded-[2rem] bg-[#fae9ef] md:grid-cols-[1.4fr_1fr]">
            <div className="relative z-10 p-6 sm:p-9 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b83f6b]">ISK Lenses · Contact</p>
              <h2 id="contact-heading" className="mt-4 max-w-2xl text-4xl font-extrabold leading-[0.96] tracking-[-0.055em] sm:text-5xl">
                {h.serviceTitle ?? 'Not sure which shade suits you?'}{!h.serviceTitle && <><br /><em className="font-serif font-normal text-[#d45782]">Ask us.</em></>}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#686371]">
                {h.serviceBody ?? 'Contact the ISK Lenses team with questions about the catalog or an order. For lens suitability and fit, consult your eye-care professional.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/contact-us" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#d45782] px-6 text-sm font-bold text-white transition hover:bg-[#b83f6b]">
                  Contact the store <ArrowRight size={17} aria-hidden="true" />
                </Link>
                {serviceBanners.slice(1, 3).map((item) => (
                  <Link key={item.id} href={item.href ?? '/contact-us'} className="inline-flex min-h-12 items-center rounded-full border border-[#201b35]/20 px-5 text-sm font-semibold text-[#201b35] hover:bg-white">{item.title}</Link>
                ))}
              </div>
            </div>
            <div className="relative min-h-48 md:absolute md:inset-y-0 md:right-0 md:w-[42%]">
              <Img
                src={serviceBanners[0]?.imageUrl ?? contactImage ?? '/isk-home/mood-gray.webp'}
                alt={serviceBanners[0]?.title ?? products[0]?.name ?? 'Illustrative contact lens image'}
                className="absolute inset-0 size-full object-cover"
              />
              {!serviceBanners[0] && !contactImage && <SampleNotice />}
            </div>
          </div>
          <StoreFooter chrome={chrome} homepage />
        </div>
      </section>

    </main>
  )
}
