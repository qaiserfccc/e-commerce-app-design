import Link from 'next/link'
import { ArrowRight, Eye, Headphones, ShieldCheck, Truck } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import { ProductCard } from '@/components/storefront/product-card'
import { getProductImageSources } from '@/components/storefront/product-image'
import type { BannerPlacement, HomeContent } from '@/lib/content-types'
import { getCatalog } from '@/lib/data/catalog'
import { getHomeContent } from '@/lib/data/site-content'
import type { Product } from '@/lib/hooks/use-storefront-data'

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />
}

function SectionHeading({ title, body, href }: { title: string; body?: string; href?: string }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e6dce1] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#201b35] sm:text-4xl">{title}</h2>
        {body && <p className="mt-2 max-w-2xl text-[#686371]">{body}</p>}
      </div>
      {href && <Link href={href} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#201b35] transition hover:text-[#b83f6b]">Explore all <ArrowRight aria-hidden="true" /></Link>}
    </div>
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
  const leadImage = trending[0] ? getProductImageSources(trending[0])[0] : undefined

  return (
    <main className="overflow-hidden bg-[#fffaf8] text-[#201b35]">
      <section id="hero" aria-label="ISK Lenses" className="mx-auto max-w-[1440px] px-4 pb-14 pt-6 sm:px-6 lg:pb-20 lg:pt-8">
        <div className="grid overflow-hidden rounded-[2rem] bg-[#f8e9ef] lg:min-h-[620px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative z-10 flex flex-col items-start justify-center px-7 py-12 sm:px-12 sm:py-16 lg:px-16">
            <h1 className="max-w-[620px] text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.96] tracking-[-0.065em] text-[#201b35]">
              Find the lens
              <br />
              <em className="font-serif font-normal text-[#d45782]">for your look.</em>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#686371] sm:text-lg">
              Browse the ISK Lenses catalog by brand, category, and the details that matter to you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#b83f6b] px-7 text-sm font-semibold text-white transition hover:bg-[#201b35]">
                Explore the catalog <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/faq" className="inline-flex min-h-14 items-center justify-center rounded-full border border-[#201b35]/20 px-7 text-sm font-semibold text-[#201b35] transition hover:bg-white/70">
                Get help choosing
              </Link>
            </div>
          </div>
          <div className="relative min-h-[360px] overflow-hidden bg-[#f2dbe4] sm:min-h-[480px] lg:min-h-[620px]">
            {hero.length > 0 ? (
              <Slider label="Featured collections" autoPlayMs={6000} dots arrows>
                {hero.map((banner) => (
                  <Link key={banner.id} href={banner.href ?? '/shop'} className="block h-full">
                    <Img src={banner.imageUrl} alt={banner.title} className="aspect-[4/3] h-full max-h-[680px] w-full object-contain lg:aspect-auto lg:min-h-[620px]" />
                  </Link>
                ))}
              </Slider>
            ) : leadImage ? (
              <Img src={leadImage} alt={trending[0]?.name ?? 'Contact lenses from the ISK Lenses catalog'} className="absolute inset-0 size-full object-cover" />
            ) : (
              <div role="img" aria-label="Abstract lens illustration, not a product photograph" className="lens-study relative grid size-full min-h-[360px] place-items-center sm:min-h-[480px] lg:min-h-[620px]">
                <span className="lens-crosshair" />
                <span className="absolute bottom-5 left-5 rounded-full bg-[#201b35]/85 px-4 py-2 text-xs font-medium text-white">Abstract lens study</span>
              </div>
            )}
            {!hero.length && leadImage && (
              <span className="absolute bottom-5 left-5 rounded-full bg-[#201b35]/85 px-4 py-2 text-xs font-medium text-white">
                {trending[0]?.name}
              </span>
            )}
          </div>
        </div>
      </section>

      {promos.length > 0 && (
        <section aria-label="Featured collections" className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:pb-20">
          {promos.map((tile) => (
            <Link key={tile.id} href={tile.href ?? '/shop'} className="group relative overflow-hidden rounded-[1.5rem] bg-[#fae9ef]">
              <Img src={tile.imageUrl} alt={tile.title} className="aspect-[2.1/1] w-full object-contain transition duration-500 group-hover:scale-[1.02]" />
              {tile.body && <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-[#201b35]">{tile.body} <ArrowRight className="ml-1 inline" aria-hidden="true" /></span>}
            </Link>
          ))}
        </section>
      )}

      {trending.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:py-12">
          <SectionHeading title="Explore the collection" href="/shop" />
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {trending.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section aria-label="Brands" className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading title="Shop by brand" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link key={brand.id} href={brand.href ?? '/shop'} className="flex h-28 items-center justify-center rounded-2xl border border-[#e6dce1] bg-white p-4 transition hover:border-[#d45782] hover:shadow-[0_12px_26px_rgba(32,27,53,0.08)]">
                <Img src={brand.imageUrl} alt={brand.title} className="max-h-16 w-full object-contain" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {whyChoose.length > 0 && (
        <section className="bg-[#f8e9ef] py-16 lg:py-20">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
            {h.whyChooseHeading && <h2 className="max-w-3xl text-3xl font-bold tracking-[-0.04em] text-[#201b35] sm:text-4xl">{h.whyChooseHeading}</h2>}
            {h.whyChooseLines && <p className="mt-3 max-w-2xl leading-7 text-[#686371]">{h.whyChooseLines.join(' · ')}</p>}
            <ul className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              {whyChoose.map((item) => (
                <li key={item.id} className="flex items-center gap-4 border-t border-[#201b35]/15 py-5">
                  <Img src={item.imageUrl} alt="" className="size-14 shrink-0 object-contain" />
                  <div>
                    <h3 className="font-semibold text-[#201b35]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[#686371]">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading title={h.categories ?? 'Browse by category'} body={h.categoriesIntro} />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((item) => (
              <li key={item.id}>
                <Link href={item.href ?? '/shop'} className="group relative block overflow-hidden rounded-[1.5rem] bg-[#fae9ef]">
                  <Img src={item.imageUrl} alt={item.title} className="aspect-[1.35/1] w-full object-contain transition duration-500 group-hover:scale-[1.02]" />
                  <span className="absolute inset-x-4 bottom-4 rounded-full bg-[#201b35]/85 px-5 py-3 text-left text-sm font-semibold text-white">{item.title}<ArrowRight className="float-right" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(h.serviceTitle || service.length > 0) && (
        <section className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-[#b83f6b] p-8 sm:p-12 md:grid-cols-[1fr_1.15fr] lg:p-16">
            <div className="relative">
              {h.serviceTitle && <h2 className="max-w-xl text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">{h.serviceTitle}</h2>}
              {h.serviceBody && <p className="mt-4 max-w-md leading-7 text-white">{h.serviceBody}</p>}
              <Link href="/shop" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#201b35] px-6 text-sm font-semibold text-white transition hover:bg-[#302a4a]">
                Shop now <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div className="relative grid grid-cols-3 gap-3">
              {service.map((item) => <Img key={item.id} src={item.imageUrl} alt={item.title} className="aspect-square w-full rounded-2xl bg-white/90 object-contain p-2" />)}
            </div>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 py-16 text-center sm:px-6 lg:py-20">
          <SectionHeading title={h.reviews ?? 'Notes from our customers'} body={h.reviewsIntro} />
          <div className="mt-8">
            <Slider label="Customer reviews" autoPlayMs={6000} dots arrows={false} perView="basis-full md:basis-1/3">
              {reviews.map((review) => (
                <figure key={review.id} className="mx-2 h-full rounded-2xl border border-[#e6dce1] bg-white p-6 text-left">
                  <span aria-hidden="true" className="font-serif text-5xl leading-none text-[#d45782]">“</span>
                  <blockquote className="mt-2 leading-7 text-[#686371]">{review.body}</blockquote>
                  <figcaption className="mt-5 font-semibold text-[#201b35]">{review.author}</figcaption>
                </figure>
              ))}
            </Slider>
          </div>
        </section>
      )}

      {seoSections.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:pb-20">
          <div className="rounded-[2rem] border border-[#e6dce1] bg-white p-6 sm:p-10">
            <SectionHeading title={h.seoTitle ?? 'About ISK Lenses'} />
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {seoSections.slice(0, 4).map((section) => (
                <article key={section.heading}>
                  <h3 className="text-lg font-semibold text-[#201b35]">{section.heading}</h3>
                  {section.paragraphs.slice(0, 1).map((text) => <p key={text.slice(0, 24)} className="mt-3 text-sm leading-7 text-[#686371]">{text}</p>)}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {newArrival && (
        <section aria-label="New arrivals" className="bg-[#fae9ef] px-4 pb-16 pt-10 sm:px-6 lg:pb-20">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#201b35] sm:text-4xl">New arrivals</h2>
              <Link href="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#201b35] transition hover:text-[#b83f6b]">Shop new <ArrowRight aria-hidden="true" /></Link>
            </div>
            <Link href={newArrival.href ?? '/shop'} className="group block overflow-hidden rounded-[1.75rem] bg-white">
              <Img src={newArrival.imageUrl} alt={newArrival.title} className="aspect-[3.6/1] w-full object-contain transition duration-700 group-hover:scale-[1.01]" />
            </Link>
          </div>
        </section>
      )}

      {features.length > 0 && (
        <section aria-label="Store information" className="border-t border-[#e6dce1] bg-white">
          <ul className="mx-auto grid max-w-[1440px] gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {features.map((feature, i) => {
              const Icon = [Truck, ShieldCheck, Headphones, Eye][i] ?? Eye
              return (
                <li key={feature.id} className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fae9ef] text-[#d45782]"><Icon aria-hidden="true" /></span>
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
