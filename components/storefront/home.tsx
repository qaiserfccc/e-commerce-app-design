import Link from 'next/link'
import { ArrowRight, Check, Eye, Sparkles, Truck, ShieldCheck, Headphones } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import { ProductCard } from '@/components/storefront/product-card'
import type { BannerPlacement, HomeContent } from '@/lib/content-types'
import { getCatalog } from '@/lib/data/catalog'
import { getHomeContent } from '@/lib/data/site-content'
import type { Product } from '@/lib/hooks/use-storefront-data'

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />
}

function SectionHeading({ eyebrow, title, body, href }: { eyebrow: string; title: string; body?: string; href?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-600">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
        {body && <p className="mt-2 max-w-2xl text-slate-500">{body}</p>}
      </div>
      {href && <Link href={href} className="inline-flex items-center gap-2 text-sm font-bold text-slate-950 transition hover:text-sky-700">Explore all <ArrowRight aria-hidden="true" /></Link>}
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

  return (
    <main className="overflow-hidden bg-[#fbfdff] text-slate-950">
      {hero.length > 0 && (
        <section aria-label="Promotions" className="w-full pt-4 sm:pt-6">
          <div className="relative w-full overflow-hidden bg-slate-950 shadow-[0_25px_70px_-35px_rgba(6,182,212,.8)]">
            <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-sky-400/30 blur-3xl" />
            <Slider label="Promotional banners" autoPlayMs={6000} dots>
              {hero.map((banner) => <Link key={banner.id} href={banner.href ?? '/shop'} className="block"><Img src={banner.imageUrl} alt={banner.title} className="block h-auto max-h-[min(62vw,560px)] w-full object-contain" /></Link>)}
            </Slider>
          </div>
        </section>
      )}

      {promos.length > 0 && (
        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-14">
          {promos.map((tile) => <Link key={tile.id} href={tile.href ?? '/shop'} className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"><Img src={tile.imageUrl} alt={tile.title} className="aspect-[2.25/1] w-full object-contain transition duration-500 group-hover:scale-[1.02]" />{tile.body && <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-950">{tile.body} <ArrowRight className="ml-1 inline" aria-hidden="true" /></span>}</Link>)}
        </section>
      )}

      {trending.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><SectionHeading eyebrow="Curated for you" title="Trending lenses" href="/shop" /><div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">{trending.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
      )}

      {brands.length > 0 && (
        <section aria-label="Brands" className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><SectionHeading eyebrow="The lens edit" title="Shop trusted brands" /><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{brands.map((brand) => <Link key={brand.id} href={brand.href ?? '/shop'} className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-100"><Img src={brand.imageUrl} alt={brand.title} className="max-h-16 w-full object-contain" /></Link>)}</div></section>
      )}

      {whyChoose.length > 0 && (
        <section className="relative bg-slate-950 py-16 text-white"><div className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl" /><div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">{h.whyChoose && <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{h.whyChoose}</p>}{h.whyChooseHeading && <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">{h.whyChooseHeading}</h2>}{h.whyChooseLines && <p className="mx-auto mt-3 max-w-2xl text-slate-400">{h.whyChooseLines.join(' · ')}</p>}<ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{whyChoose.map((item) => <li key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition hover:border-cyan-300/50 hover:bg-white/10"><Img src={item.imageUrl} alt="" className="mx-auto size-16 object-contain" /><h3 className="mt-4 font-bold">{item.title}</h3><Check className="mx-auto mt-3 text-cyan-300" aria-hidden="true" /></li>)}</ul></div></section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6"><SectionHeading eyebrow="Find your look" title={h.categories ?? 'Shop by category'} body={h.categoriesIntro} /><ul className="mt-8 grid gap-4 md:grid-cols-3">{categories.map((item) => <li key={item.id}><Link href={item.href ?? '/shop'} className="group relative block overflow-hidden rounded-[1.5rem]"><Img src={item.imageUrl} alt={item.title} className="aspect-[1.35/1] w-full object-contain transition duration-500 group-hover:scale-[1.02]" /><span className="absolute inset-x-4 bottom-4 rounded-xl bg-slate-950/75 px-4 py-3 text-left text-sm font-bold text-white backdrop-blur">{item.title}<ArrowRight className="float-right" aria-hidden="true" /></span></Link></li>)}</ul></section>
      )}

      {(h.serviceTitle || service.length > 0) && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6"><div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-sky-400 p-8 sm:p-12 md:grid-cols-[1fr_1.15fr]"><Sparkles className="absolute -right-5 -top-8 size-44 text-white/30" aria-hidden="true" /><div className="relative"><p className="text-xs font-black uppercase tracking-[0.24em] text-slate-700">Delivery, simplified</p>{h.serviceTitle && <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{h.serviceTitle}</h2>}{h.serviceBody && <p className="mt-4 max-w-md leading-7 text-slate-800">{h.serviceBody}</p>}<Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Shop now <ArrowRight aria-hidden="true" /></Link></div><div className="relative grid grid-cols-3 gap-3">{service.map((item) => <Img key={item.id} src={item.imageUrl} alt="" className="aspect-square w-full rounded-2xl bg-white/50 object-contain p-2" />)}</div></div></section>
      )}

      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6"><SectionHeading eyebrow="Real people, real love" title={h.reviews ?? 'Customer reviews'} body={h.reviewsIntro} /><div className="mt-8"><Slider label="Customer reviews" autoPlayMs={6000} dots arrows={false} perView="basis-full md:basis-1/3">{reviews.map((review) => <figure key={review.id} className="mx-2 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"><div className="flex gap-1 text-cyan-500">{[1, 2, 3, 4, 5].map((star) => <Sparkles key={star} className="size-4" aria-hidden="true" />)}</div><blockquote className="mt-5 leading-7 text-slate-600">“{review.body}”</blockquote><figcaption className="mt-5 font-bold text-slate-950">{review.author}</figcaption></figure>)}</Slider></div></section>
      )}

      {seoSections.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10"><SectionHeading eyebrow="The ISK journal" title={h.seoTitle ?? 'About ISK Lenses'} /><div className="mt-8 grid gap-8 md:grid-cols-2">{seoSections.slice(0, 4).map((section) => <article key={section.heading}><h3 className="text-lg font-black text-slate-900">{section.heading}</h3>{section.paragraphs.slice(0, 1).map((text) => <p key={text.slice(0, 24)} className="mt-3 text-sm leading-7 text-slate-500">{text}</p>)}</article>)}</div></div></section>
      )}

      {newArrival && (
        <section aria-label="New arrivals" className="bg-gradient-to-r from-violet-50 via-white to-cyan-50 px-4 pb-16 sm:px-6"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-600">Just landed</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">New arrivals</h2></div><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-slate-950 transition hover:text-violet-600">Shop new <ArrowRight aria-hidden="true" /></Link></div><Link href={newArrival.href ?? '/shop'} className="group block overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_24px_70px_-35px_rgba(124,58,237,.45)]"><Img src={newArrival.imageUrl} alt={newArrival.title} className="aspect-[3.6/1] w-full object-contain transition duration-700 group-hover:scale-[1.01]" /></Link></div></section>
      )}

      {features.length > 0 && (
        <section aria-label="Store promises" className="border-t border-slate-200 bg-white"><ul className="mx-auto grid max-w-6xl gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">{features.map((feature, i) => { const Icon = [Truck, ShieldCheck, Headphones, Eye][i] ?? Eye; return <li key={feature.id} className="flex items-center gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600"><Icon aria-hidden="true" /></span><div><h3 className="font-bold text-slate-950">{feature.title}</h3>{feature.body && <p className="text-sm text-slate-500">{feature.body}</p>}</div></li> })}</ul></section>
      )}
    </main>
  )
}
