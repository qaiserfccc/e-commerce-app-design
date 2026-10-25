import Link from 'next/link'
import { ArrowRight, BookOpen, Compass, Eye, Headphones, ShoppingBag, type LucideIcon } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import { SectionProgress } from '@/components/storefront/home/section-progress'
import { TrendingProducts } from '@/components/storefront/home/trending-products'
import { StoreFooter } from '@/components/storefront/shell/store-footer'
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
    image: '/isk-home/banner-deals.webp',
    alt: 'Sample portrait wearing hazel-gray contact lenses',
    label: 'EXPLORE COLOR LENSES',
    title: 'Find your shade',
    accent: 'Own the mood.',
    body: 'Browse colored lens listings and review the details shown for each product.',
    action: 'Browse color lenses',
    href: '/shop?q=colored',
    tone: 'light',
  },
  {
    image: '/isk-home/banner-featured.webp',
    alt: 'Sample contact lens packaging and case on a stone pedestal',
    label: 'FEATURED COLLECTION',
    title: 'Bella Elite',
    accent: 'Glow Collection',
    body: 'Explore the ISK Lenses catalog and compare the information listed with each product.',
    action: 'Explore Bella lenses',
    href: '/shop?q=Bella',
    tone: 'light',
  },
  {
    image: '/isk-home/banner-news.webp',
    alt: 'Sample portrait wearing green contact lenses',
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
  { name: 'Gray', image: '/isk-home/eye-gray.webp', color: '#a3abb3' },
  { name: 'Hazel', image: '/isk-home/eye-hazel.webp', color: '#b39150' },
  { name: 'Brown', image: '/isk-home/eye-brown.webp', color: '#96613a' },
  { name: 'Green', image: '/isk-home/eye-green.webp', color: '#43885c' },
  { name: 'Blue', image: '/isk-home/eye-blue.webp', color: '#6aa8d3' },
  { name: 'Violet', image: '/isk-home/eye-violet.webp', color: '#9478bc' },
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

function Hero() {
  return (
    <section id="hero" aria-label="Featured lens collections" className="isk-home-section relative h-full min-h-full snap-start snap-always">
      <Slider label="Featured lens collections" autoPlayMs={5500} dots arrows editorialControls fullHeight>
        {demoSlides.map((slide, index) => {
          const dark = slide.tone === 'dark'
          return (
            <div key={slide.image} className="relative h-full min-h-full overflow-hidden bg-[#f7e8ed]">
              <Img src={slide.image} alt={slide.alt} priority={index === 0} className="absolute inset-0 size-full object-cover object-[68%_center]" />
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
                    {slide.label}
                  </span>
                  <h1 className="mt-7 text-balance text-[clamp(3.5rem,7.6vw,7rem)] font-extrabold leading-[0.91] tracking-[-0.065em]">
                    {slide.title}
                    <span className={`mt-2 block font-serif text-[.76em] font-normal italic leading-[1.02] tracking-[-0.04em] ${dark ? 'text-[#f3b4c9]' : 'text-[#e84f88]'}`}>{slide.accent}</span>
                  </h1>
                  <p className={`mt-6 max-w-xl text-lg leading-8 sm:text-xl ${dark ? 'text-white/85' : 'text-[#686371]'}`}>{slide.body}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link href={slide.href} className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-[#b83f6b] px-7 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#201b35]">
                      {slide.action}
                      <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} aria-hidden="true" />
                    </Link>
                    <Link href="#brands" className={`inline-flex min-h-14 items-center rounded-full border px-7 text-sm font-bold transition ${dark ? 'border-white/35 text-white hover:bg-white/10' : 'border-[#201b35]/25 text-[#201b35] hover:bg-white/70'}`}>
                      Compare options
                    </Link>
                  </div>
                  <p className={`mt-5 text-xs ${dark ? 'text-white/75' : 'text-[#686371]'}`}>Sample campaign content · illustrative image</p>
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
  return (
    <main id="isk-home-scroll" tabIndex={0} aria-label="Homepage sections, scroll to explore" className="isk-home snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth bg-[#fffaf8] text-[#201b35]">
      <Hero />
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
              return (
                <li key={mood.name} className={index % 2 ? 'lg:translate-y-12' : ''}>
                  <Link href={`/shop?q=${encodeURIComponent(mood.name)}`} className="group block text-center">
                    <span className="relative block overflow-hidden rounded-[50%] bg-[#e9d8cf]">
                      <Img src={mood.image} alt={`Sample ${mood.name.toLowerCase()} lens look`} className="aspect-[.68/1] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                    </span>
                    <span className={`mt-3 block text-base font-bold ${index === 0 ? 'text-[#d45782]' : 'text-[#201b35]'}`}>{mood.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section id="brands" aria-labelledby="brands-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#fffaf8] py-8 sm:py-10 lg:flex lg:items-center">
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
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            {(brandNames.length ? brandNames : demoBrands).slice(0, 12).map((brand) => (
              <li key={brand}>
                <Link href={`/shop?q=${encodeURIComponent(brand)}`} className="group flex min-h-28 flex-col justify-center rounded-3xl border border-[#e6dce1] bg-white px-4 py-3 transition-colors hover:border-[#d45782] sm:min-h-32">
                  <span className={`text-lg text-[#201b35] group-hover:text-[#b83f6b] ${brandWordmarkClass(brand)}`}>{brand}</span>
                  <span className="mt-1 text-xs text-[#686371]">Browse listings</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="shades" aria-labelledby="shades-heading" className="isk-home-section min-h-full snap-start snap-always bg-[#f6eeea] py-8 sm:py-10 lg:flex lg:items-center">
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
                  <span className="block overflow-hidden rounded-full border-[5px] border-white bg-white shadow-[0_3px_8px_rgba(32,27,53,0.12)]">
                    <Img src={shade.image} alt={`Sample close-up of a ${shade.name.toLowerCase()} contact lens`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  </span>
                  <span className="mt-4 flex items-center justify-center gap-2 text-base font-bold text-[#201b35] sm:text-lg">
                    <span aria-hidden="true" className="size-3 rounded-full ring-2 ring-white" style={{ backgroundColor: shade.color }} />
                    {shade.name}
                  </span>
                  <span className="mt-1 block text-sm text-[#686371]">Explore shade</span>
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
              ['Colored lenses', 'Explore color lens listings', 'colored'],
              ['Daily disposable', 'Browse lens listings', 'daily'],
              ['Monthly', 'Browse lens listings', 'monthly'],
              ['3 & 6 months', 'Browse lens listings', 'extended-wear'],
              ['Yearly', 'Browse lens listings', 'yearly'],
              ['Toric', 'Explore toric lens listings', 'toric'],
              ['Solutions & care', 'Browse care information', 'solutions'],
            ].map(([title, body, query], index) => (
              <li key={title} className={index === 0 ? 'col-span-2 sm:col-span-1 sm:row-span-3' : ''}>
                {index === 0 ? (
                  <Link href={`/shop?q=${encodeURIComponent(query)}`} className="group relative flex min-h-64 h-full flex-col justify-end overflow-hidden rounded-3xl bg-[#201b35] p-6 text-white sm:min-h-0">
                    <Img src="/isk-home/mood-hazel.webp" alt="" priority className="absolute inset-0 size-full object-cover opacity-65 transition duration-500 group-hover:scale-105" />
                    <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(32,27,53,.96), rgba(32,27,53,.22) 48%, transparent)' }} />
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
          <div className="isk-review-rows mt-8 space-y-4">
            {[0, 1].map((row) => (
              <div key={row} className="isk-review-track group flex w-max gap-4 py-1" dir={row ? 'rtl' : 'ltr'}>
                {[...reviewCards, ...reviewCards].map((review, index) => (
                  <figure key={`${row}-${review.id}-${index}`} dir="ltr" className="flex min-h-56 w-[min(84vw,440px)] flex-col rounded-[2rem] border border-[#e6dce1] bg-white p-5 sm:w-[440px] sm:p-6">
                    {!hasRealReviews && <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#b83f6b]">Sample content</span>}
                    <blockquote className="mt-5 flex-1 text-lg leading-8 text-[#201b35] sm:text-xl">“{review.body}”</blockquote>
                    <figcaption className="mt-5 flex items-center gap-3 border-t border-[#e6dce1] pt-4 text-sm font-semibold text-[#686371]">
                      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fbefe5] font-bold text-[#b83f6b]">{hasRealReviews ? review.author.slice(0, 1) : 'S'}</span>
                      <span>{hasRealReviews ? review.author : 'Sample preview · not a customer review'}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
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
                {serviceBanners.slice(1, 3).map((item) => (
                  <Link key={item.id} href={item.href ?? '/contact-us'} className="inline-flex min-h-12 items-center rounded-full border border-white/60 px-5 text-sm font-semibold text-white transition hover:bg-white/15">{item.title}</Link>
                ))}
              </div>
            </div>
            <div className="relative z-10 flex min-h-[260px] items-center justify-center px-6 pb-6 md:min-h-0 md:px-8 md:py-10">
              <Img
                src="/isk-home/mood-gray.webp"
                alt="Sample portrait holding contact lens packaging"
                className="isk-home-contact-portrait aspect-[1.05/1] w-full max-w-[400px] rounded-[50%] object-cover object-top"
              />
              <SampleNotice />
            </div>
          </div>
          <StoreFooter chrome={chrome} homepage />
        </div>
      </section>

    </main>
  )
}
