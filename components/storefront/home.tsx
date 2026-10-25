import Link from 'next/link'
import { ArrowRight, Eye, Headphones, ShieldCheck, Truck } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import { ProductCard } from '@/components/storefront/product-card'
import { getProductImageSources } from '@/lib/storefront/product-image-sources'
import type { BannerPlacement, HomeContent } from '@/lib/content-types'
import { getCatalog } from '@/lib/data/catalog'
import { getHomeContent } from '@/lib/data/site-content'
import type { Product } from '@/lib/hooks/use-storefront-data'

function Img({ src, alt, className, priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className={className} />
}

function SectionHeading({ title, body, href, inverse = false }: { title: string; body?: string; href?: string; inverse?: boolean }) {
  const titleClass = inverse ? 'text-white' : 'text-[#201b35]'
  const bodyClass = inverse ? 'text-white/75' : 'text-[#686371]'
  return (
    <div className={`flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between ${inverse ? 'border-white/25' : 'border-[#e6dce1]'}`}>
      <div>
        <h2 className={`text-3xl font-bold tracking-[-0.045em] sm:text-4xl ${titleClass}`}>{title}</h2>
        {body && <p className={`mt-2 max-w-2xl ${bodyClass}`}>{body}</p>}
      </div>
      {href && (
        <Link href={href} className={`inline-flex shrink-0 items-center gap-2 text-sm font-semibold transition ${inverse ? 'text-[#f3b4c9] hover:text-white' : 'text-[#201b35] hover:text-[#b83f6b]'}`}>
          Explore all <ArrowRight size={17} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

const sampleSlides = [
  {
    image: '/isk-home/banner-deals.webp',
    alt: 'Sample portrait artwork for the ISK Lenses homepage',
    title: <>Find a shade that <em className="font-serif font-normal text-[#b83f6b]">feels like you.</em></>,
    body: 'Browse the ISK Lenses catalog by color, brand, and the details that matter to you.',
    href: '/shop',
    action: 'Explore lenses',
    tone: 'light',
  },
  {
    image: '/isk-home/banner-featured.webp',
    alt: 'Sample contact lens packaging and case arranged on a pedestal',
    title: <>A closer look at <em className="font-serif font-normal text-[#b83f6b]">your options.</em></>,
    body: 'Compare the product information and choices listed for each lens.',
    href: '/shop',
    action: 'Browse the catalog',
    tone: 'light',
  },
  {
    image: '/isk-home/banner-news.webp',
    alt: 'Sample portrait artwork with green-colored contact lenses',
    title: <>Make room for a <em className="font-serif font-normal text-[#f3b4c9]">new point of view.</em></>,
    body: 'Explore different looks, and follow your eye-care professional’s guidance when choosing lenses.',
    href: '/faq',
    action: 'How to choose',
    tone: 'dark',
  },
] as const

const sampleShades = [
  { name: 'Gray', image: '/isk-home/eye-gray.webp', query: 'gray' },
  { name: 'Hazel', image: '/isk-home/eye-hazel.webp', query: 'hazel' },
  { name: 'Brown', image: '/isk-home/eye-brown.webp', query: 'brown' },
  { name: 'Green', image: '/isk-home/eye-green.webp', query: 'green' },
  { name: 'Blue', image: '/isk-home/eye-blue.webp', query: 'blue' },
  { name: 'Violet', image: '/isk-home/eye-violet.webp', query: 'violet' },
]

const sampleMoods = [
  { name: 'Honey', image: '/isk-home/mood-honey.webp' },
  { name: 'Mist', image: '/isk-home/mood-gray.webp' },
  { name: 'Ocean', image: '/isk-home/mood-blue.webp' },
  { name: 'Hazel', image: '/isk-home/mood-hazel.webp' },
  { name: 'Matcha', image: '/isk-home/mood-green.webp' },
]

const sampleProducts = [
  { name: 'Sterling Gray', image: '/isk-home/eye-gray.webp', query: 'gray' },
  { name: 'Mel Honey', image: '/isk-home/eye-hazel.webp', query: 'honey' },
  { name: 'Hazel Gold', image: '/isk-home/eye-brown.webp', query: 'hazel' },
  { name: 'Emerald Green', image: '/isk-home/eye-green.webp', query: 'green' },
]

const sampleBrands = ['Bella', 'Hydrocor', 'Dahab', 'FreshLook', 'Solotica']

function SampleProductCard({ name, image, query }: (typeof sampleProducts)[number]) {
  return (
    <article className="group min-w-0">
      <Link href={`/shop?q=${encodeURIComponent(query)}`} aria-label={`Browse lenses related to ${name}`} className="relative block overflow-hidden rounded-[1.25rem] bg-[#fae9ef]">
        <Img
          src={image}
          alt={`Illustrative ${name} eye image, shown as sample artwork`}
          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#201b35]">Sample item</span>
      </Link>
      <div className="pt-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#686371]">Design preview</p>
        <h3 className="mt-1 text-base font-semibold text-[#201b35]">{name}</h3>
        <Link href={`/shop?q=${encodeURIComponent(query)}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#b83f6b] hover:text-[#201b35]">
          Browse lenses <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

async function loadHome(): Promise<{ content: HomeContent | null; trending: Product[] }> {
  const [content, catalog] = await Promise.allSettled([getHomeContent(), getCatalog()])
  if (content.status === 'rejected') console.error('[home] Content unavailable', content.reason instanceof Error ? content.reason.name : 'UnknownError')
  if (catalog.status === 'rejected') console.error('[home] Catalog unavailable', catalog.reason instanceof Error ? catalog.reason.name : 'UnknownError')
  return {
    content: content.status === 'fulfilled' ? content.value : null,
    trending: catalog.status === 'fulfilled' ? (catalog.value.slice(0, 8) as unknown as Product[]) : [],
  }
}

export async function Home() {
  const { content, trending } = await loadHome()
  const banners = (placement: BannerPlacement) => content?.banners.filter((banner) => banner.placement === placement) ?? []
  const h = content?.headings ?? {}
  const hero = banners('hero')
  const promos = banners('promo')
  const brands = banners('brand')
  const whyChoose = banners('why_choose')
  const categories = banners('category')
  const service = banners('service')
  const newArrival = banners('new_arrival')[0]
  const features = banners('feature')
  const reviews = content?.reviews ?? []
  const seoSections = content?.seoSections ?? []
  const brandNames = [...new Set(trending.map((product) => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))].slice(0, 6)
  const leadImage = trending[0] ? getProductImageSources(trending[0])[0] : undefined

  return (
    <main className="overflow-hidden bg-[#fffaf8] text-[#201b35]">
      <section id="hero" aria-label="ISK Lenses featured collections" className="relative">
        <Slider label="Featured lens collections" autoPlayMs={6000} dots arrows>
          {(hero.length ? hero : sampleSlides).map((slide, index) => {
            const isSample = 'tone' in slide
            const tone = isSample ? slide.tone : 'light'
            const title = isSample ? slide.title : slide.title
            const body = slide.body
            const href = slide.href ?? '/shop'
            const image = isSample ? slide.image : slide.imageUrl
            return (
              <div key={isSample ? slide.image : slide.id} className="relative min-h-[600px] overflow-hidden bg-[#fae9ef] lg:min-h-[min(760px,calc(100svh-150px))]">
                {leadImage && !hero.length && index === 1 ? (
                  <Img src={leadImage} alt={trending[0]?.name ?? 'Lens from the ISK Lenses catalog'} className="absolute inset-0 size-full object-cover object-[70%_center]" priority />
                ) : (
                  <Img src={image} alt={isSample ? slide.alt : slide.title} className="absolute inset-0 size-full object-cover object-[70%_center]" priority={index === 0} />
                )}
                <div className={`absolute inset-0 ${tone === 'dark' ? 'bg-[linear-gradient(90deg,rgba(32,27,53,0.96)_0%,rgba(32,27,53,0.78)_42%,rgba(32,27,53,0.08)_100%)]' : 'bg-[linear-gradient(90deg,rgba(255,250,248,0.96)_0%,rgba(255,250,248,0.82)_42%,rgba(255,250,248,0.04)_100%)]'}`} />
                <div className="relative mx-auto flex min-h-[600px] max-w-[1440px] items-center px-5 pb-20 pt-12 sm:px-10 lg:min-h-[min(760px,calc(100svh-150px))] lg:px-16">
                  <div className={`max-w-2xl ${tone === 'dark' ? 'text-white' : 'text-[#201b35]'}`}>
                    <h1 className="max-w-[650px] text-balance text-[clamp(3.25rem,7vw,6.25rem)] font-bold leading-[0.96] tracking-[-0.065em]">
                      {title}
                    </h1>
                    {body && <p className={`mt-6 max-w-lg text-base leading-7 sm:text-lg ${tone === 'dark' ? 'text-white/85' : 'text-[#686371]'}`}>{body}</p>}
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Link href={href} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#b83f6b] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#201b35]">
                        {isSample ? slide.action : 'Explore this collection'} <ArrowRight size={17} aria-hidden="true" />
                      </Link>
                      {isSample && index === 0 && (
                        <Link href="#shades" className="inline-flex min-h-12 items-center rounded-full border border-[#201b35]/25 px-6 py-3 text-sm font-semibold text-[#201b35] transition hover:bg-white/70">
                          Browse by shade
                        </Link>
                      )}
                    </div>
                    {isSample && <span className={`mt-7 inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${tone === 'dark' ? 'bg-white/15 text-white' : 'bg-white/80 text-[#686371]'}`}>Illustrative campaign image</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </Slider>
      </section>

      {promos.length > 0 && (
        <section aria-label="Featured collections" className="mx-auto grid max-w-[1440px] gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:py-16">
          {promos.map((tile) => (
            <Link key={tile.id} href={tile.href ?? '/shop'} className="group relative overflow-hidden rounded-[1.5rem] bg-[#fae9ef]">
              <Img src={tile.imageUrl} alt={tile.title} className="aspect-[2.1/1] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#201b35]">
                {tile.body ?? tile.title} <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </section>
      )}

      <section id="bloom" className="bg-[#fae9ef] py-16 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-[-0.055em] text-[#201b35] sm:text-5xl">
                Pick a shade. <em className="font-serif font-normal text-[#b83f6b]">Set the mood.</em>
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-[#686371]">A visual preview of color directions. Images are illustrative; check product details for available options.</p>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#201b35] hover:text-[#b83f6b]">
              Browse lenses <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {sampleMoods.map((mood) => (
              <li key={mood.name}>
                <Link href={`/shop?q=${encodeURIComponent(mood.name)}`} className="group relative block overflow-hidden rounded-[1.35rem] bg-white">
                  <Img src={mood.image} alt={`Illustrative ${mood.name.toLowerCase()} contact lens look`} className="aspect-[0.72/1] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#201b35]/90 px-4 py-4 text-lg font-semibold text-white">
                    {mood.name}<ArrowRight size={17} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="shades" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading title="Find your color" body="From understated neutrals to brighter shades, explore a few sample looks." href="/shop" />
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {sampleShades.map((shade) => (
            <li key={shade.name}>
              <Link href={`/shop?q=${encodeURIComponent(shade.query)}`} className="group relative block overflow-hidden rounded-full bg-[#fae9ef]">
                <Img src={shade.image} alt={`Illustrative close-up of an eye with a ${shade.name.toLowerCase()} lens`} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/95 px-3 py-2 text-center text-sm font-semibold text-[#201b35]">{shade.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(brands.length > 0 || brandNames.length > 0 || trending.length === 0) && (
        <section id="brands" aria-label="Lens brands" className="border-y border-[#e6dce1] bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeading
              title="Explore by brand"
              body={brands.length ? undefined : brandNames.length ? 'Brands shown are taken from the current catalog.' : 'Sample brand names for the design preview; catalog brands will appear here.'}
              href="/shop"
            />
            {brands.length > 0 ? (
              <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {brands.slice(0, 6).map((brand) => (
                  <li key={brand.id}>
                    <Link href={brand.href ?? `/shop?q=${encodeURIComponent(brand.title)}`} className="flex h-24 items-center justify-center rounded-2xl border border-[#e6dce1] bg-[#fffaf8] p-4 transition hover:border-[#d45782]">
                      <Img src={brand.imageUrl} alt={brand.title} className="max-h-14 w-full object-contain" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {(brandNames.length ? brandNames : sampleBrands).map((brand) => (
                  <li key={brand}>
                    <Link href={`/shop?q=${encodeURIComponent(brand)}`} className="flex min-h-24 items-center justify-center rounded-2xl border border-[#e6dce1] bg-[#fffaf8] px-4 text-center text-xl font-bold tracking-[-0.04em] text-[#201b35] transition hover:border-[#d45782] hover:text-[#b83f6b]">
                      {brand}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section id="trending" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading title="Explore the collection" body={trending.length ? undefined : 'Sample items show the layout only. Product availability and details will come from the catalog.'} href="/shop" />
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {trending.length > 0
            ? trending.map((product) => <ProductCard key={product.id} product={product} />)
            : sampleProducts.map((product) => <SampleProductCard key={product.name} {...product} />)}
        </div>
      </section>

      <section id="types" className="bg-[#201b35] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <SectionHeading title="Browse your way" body="Start with a lens category, then compare the product details before choosing." href="/shop" inverse />
          <ul className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ['Colored lenses', 'Explore color options', 'colored'],
              ['Clear lenses', 'Browse transparent styles', 'clear'],
              ['Toric lenses', 'See toric lens listings', 'toric'],
            ].map(([title, description, query]) => (
              <li key={title}>
                <Link href={`/shop?q=${encodeURIComponent(query)}`} className="group flex min-h-28 items-center justify-between border-t border-white/25 py-5 transition-colors hover:border-[#f3b4c9]">
                  <span>
                    <span className="block text-xl font-semibold tracking-[-0.03em]">{title}</span>
                    <span className="mt-1 block text-sm text-white/70">{description}</span>
                  </span>
                  <ArrowRight className="shrink-0 text-[#f3b4c9] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading title={h.categories ?? 'Browse by category'} body={h.categoriesIntro} href="/shop" />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((item) => (
              <li key={item.id}>
                <Link href={item.href ?? '/shop'} className="group relative block overflow-hidden rounded-[1.5rem] bg-[#fae9ef]">
                  <Img src={item.imageUrl} alt={item.title} className="aspect-[1.35/1] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                  <span className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-[#201b35]/90 px-5 py-3 text-sm font-semibold text-white">
                    {item.title}<ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {whyChoose.length > 0 && (
        <section className="bg-[#f8e9ef] py-16 lg:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <h2 className="max-w-3xl text-3xl font-bold tracking-[-0.04em] text-[#201b35] sm:text-4xl">{h.whyChooseHeading ?? 'A little more about ISK Lenses'}</h2>
            {h.whyChooseLines && <p className="mt-3 max-w-2xl leading-7 text-[#686371]">{h.whyChooseLines.join(' · ')}</p>}
            <ul className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              {whyChoose.map((item) => (
                <li key={item.id} className="flex items-center gap-4 border-t border-[#201b35]/15 py-5">
                  <Img src={item.imageUrl} alt="" className="size-14 shrink-0 object-contain" />
                  <div>
                    <h3 className="font-semibold text-[#201b35]">{item.title}</h3>
                    {item.body && <p className="mt-1 text-sm text-[#686371]">{item.body}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(h.serviceTitle || service.length > 0) && (
        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-[#b83f6b] p-8 sm:p-12 md:grid-cols-[1fr_1.15fr] lg:p-16">
            <div className="relative">
              <h2 className="max-w-xl text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">{h.serviceTitle ?? 'Need help choosing?'}</h2>
              {h.serviceBody && <p className="mt-4 max-w-md leading-7 text-white/90">{h.serviceBody}</p>}
              <Link href="/contact-us" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#201b35] px-6 text-sm font-semibold text-white transition hover:bg-[#302a4a]">
                Get in touch <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div className="relative grid grid-cols-3 gap-3">
              {service.map((item) => <Img key={item.id} src={item.imageUrl} alt={item.title} className="aspect-square w-full rounded-2xl bg-white/90 object-contain p-2" />)}
            </div>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="bg-[#fae9ef] py-16 sm:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            <SectionHeading title={h.reviews ?? 'Customer notes'} body={h.reviewsIntro} />
            <div className="mt-8">
              <Slider label="Customer notes" autoPlayMs={6000} dots arrows={false} perView="basis-full md:basis-1/3">
                {reviews.map((review) => (
                  <figure key={review.id} className="mx-2 h-full border-t border-[#201b35]/20 px-2 py-6 text-left">
                    <span aria-hidden="true" className="font-serif text-5xl leading-none text-[#b83f6b]">“</span>
                    <blockquote className="mt-2 leading-7 text-[#686371]">{review.body}</blockquote>
                    <figcaption className="mt-5 font-semibold text-[#201b35]">{review.author}</figcaption>
                  </figure>
                ))}
              </Slider>
            </div>
          </div>
        </section>
      )}

      {seoSections.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading title={h.seoTitle ?? 'About ISK Lenses'} />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {seoSections.slice(0, 4).map((section) => (
              <article key={section.heading}>
                <h3 className="text-lg font-semibold text-[#201b35]">{section.heading}</h3>
                {section.paragraphs.slice(0, 1).map((text) => <p key={text.slice(0, 24)} className="mt-3 text-sm leading-7 text-[#686371]">{text}</p>)}
              </article>
            ))}
          </div>
        </section>
      )}

      {newArrival && (
        <section aria-label="New arrivals" className="bg-[#fae9ef] px-4 py-14 sm:px-6 lg:py-16">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#201b35] sm:text-4xl">New arrivals</h2>
              <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#201b35] transition hover:text-[#b83f6b]">Shop new <ArrowRight aria-hidden="true" /></Link>
            </div>
            <Link href={newArrival.href ?? '/shop'} className="group block overflow-hidden rounded-[1.75rem] bg-white">
              <Img src={newArrival.imageUrl} alt={newArrival.title} className="aspect-[3.6/1] w-full object-cover transition duration-700 group-hover:scale-[1.01]" />
            </Link>
          </div>
        </section>
      )}

      {features.length > 0 && (
        <section aria-label="Store information" className="border-t border-[#e6dce1] bg-white">
          <ul className="mx-auto grid max-w-[1440px] gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = [Truck, ShieldCheck, Headphones, Eye][index] ?? Eye
              return (
                <li key={feature.id} className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fae9ef] text-[#b83f6b]"><Icon aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-semibold text-[#201b35]">{feature.title}</h3>
                    {feature.body && <p className="text-sm text-[#686371]">{feature.body}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
