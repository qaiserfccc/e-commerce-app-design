import Link from 'next/link'
import { ArrowRight, Check, Eye, Sparkles, Truck, ShieldCheck, Headphones } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import {
  dummyBanners, dummyBrandLogos, dummyCategories, dummyFeatures, dummyNewArrivals,
  dummyPromoTiles, dummyReviews, dummySeo, dummyService, dummyTrending, dummyWhyChoose, type DummyProduct,
} from '@/lib/dummy/eyelenses-home'
import { formatPrice } from '@/lib/store-config'

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

function ProductCard({ product }: { product: DummyProduct }) {
  const off = Math.round((1 - product.salePrice / product.price) * 100)
  return (
    <article className="group relative rounded-[1.5rem] border border-slate-200/80 bg-white p-2 shadow-[0_14px_40px_-28px_rgba(8,47,73,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-25px_rgba(6,182,212,.35)]">
      <span className="absolute left-4 top-4 z-10 rounded-full bg-sky-400 px-3 py-1 text-[10px] font-black tracking-wide text-slate-950">-{off}%</span>
      <Link href={`/product/${product.slug}`} className="block overflow-hidden rounded-[1.1rem] bg-slate-100"><Img src={product.image} alt={product.name} className="aspect-[5/6] w-full object-contain transition duration-500 group-hover:scale-[1.02]" /></Link>
      <div className="p-3">
        <h3 className="min-h-10 text-sm font-bold leading-5 text-slate-900"><Link href={`/product/${product.slug}`} className="hover:text-sky-700">{product.name}</Link></h3>
        <p className="mt-2 text-[11px] font-medium text-slate-400">Dia {product.dia} · {product.modality}</p>
        <div className="mt-2 flex items-center gap-2"><del className="text-xs text-slate-400">{formatPrice(product.price, 'PKR')}</del><strong className="text-sm text-cyan-700">{formatPrice(product.salePrice, 'PKR')}</strong></div>
      </div>
    </article>
  )
}

export function Home() {
  return (
    <main className="overflow-hidden bg-[#fbfdff] text-slate-950">
      <section aria-label="Promotions" className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-[0_25px_70px_-35px_rgba(6,182,212,.8)]">
          <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-sky-400/30 blur-3xl" />
          <Slider label="Promotional banners" autoPlayMs={6000} dots>
            {dummyBanners.map((banner) => <Link key={banner.src} href={banner.href} className="block"><Img src={banner.src} alt={banner.alt} className="mx-auto h-auto max-h-[420px] w-full object-contain" /></Link>)}
          </Slider>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-14">
        {dummyPromoTiles.map((tile, i) => <Link key={tile.src} href={tile.href} className="group relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"><Img src={tile.src} alt={tile.alt} className="aspect-[2.25/1] w-full object-contain transition duration-500 group-hover:scale-[1.02]" /><span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-950">{i === 0 ? 'Natural clarity' : 'Color your world'} <ArrowRight className="ml-1 inline" aria-hidden="true" /></span></Link>)}
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6"><SectionHeading eyebrow="Curated for you" title="Trending lenses" body="Fresh colors, everyday comfort, and standout looks in one edit." href="/product-category/colored-lenses" /><div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">{dummyTrending.slice(0, 8).map((product) => <ProductCard key={product.slug} product={product} />)}</div></section>

      <section aria-label="Brands" className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><SectionHeading eyebrow="The lens edit" title="Shop trusted brands" /><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{dummyBrandLogos.map((brand) => <Link key={brand.name} href={brand.href} className="flex h-28 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-100"><Img src={brand.src} alt={brand.name} className="max-h-16 w-full object-contain" /></Link>)}</div></section>

      <section className="relative bg-slate-950 py-16 text-white"><div className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-sky-400/15 blur-3xl" /><div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">{dummyWhyChoose.eyebrow}</p><h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">See the difference in every detail.</h2><p className="mx-auto mt-3 max-w-2xl text-slate-400">{dummyWhyChoose.lines.join(' · ')}</p><ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{dummyWhyChoose.items.map((item) => <li key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition hover:border-cyan-300/50 hover:bg-white/10"><Img src={item.src} alt="" className="mx-auto size-16 object-contain" /><h3 className="mt-4 font-bold">{item.title}</h3><Check className="mx-auto mt-3 text-cyan-300" aria-hidden="true" /></li>)}</ul></div></section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6"><SectionHeading eyebrow="Find your look" title="Shop by category" body="Your eyes, your mood, your signature." /><ul className="mt-8 grid gap-4 md:grid-cols-3">{dummyCategories.items.map((item) => <li key={item.alt}><Link href={item.href} className="group relative block overflow-hidden rounded-[1.5rem]"><Img src={item.src} alt={item.alt} className="aspect-[1.35/1] w-full object-contain transition duration-500 group-hover:scale-[1.02]" /><span className="absolute inset-x-4 bottom-4 rounded-xl bg-slate-950/75 px-4 py-3 text-left text-sm font-bold text-white backdrop-blur">{item.alt}<ArrowRight className="float-right" aria-hidden="true" /></span></Link></li>)}</ul></section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6"><div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-sky-400 p-8 sm:p-12 md:grid-cols-[1fr_1.15fr]"><Sparkles className="absolute -right-5 -top-8 size-44 text-white/30" aria-hidden="true" /><div className="relative"><p className="text-xs font-black uppercase tracking-[0.24em] text-slate-700">Delivery, simplified</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{dummyService.title}</h2><p className="mt-4 max-w-md leading-7 text-slate-800">{dummyService.body}</p><Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Shop now <ArrowRight aria-hidden="true" /></Link></div><div className="relative grid grid-cols-3 gap-3">{dummyService.images.map((src) => <Img key={src} src={src} alt="" className="aspect-square w-full rounded-2xl bg-white/50 object-contain p-2" />)}</div></div></section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6"><SectionHeading eyebrow="Real people, real love" title={dummyReviews.heading} body={dummyReviews.intro} /><div className="mt-8"><Slider label="Customer reviews" autoPlayMs={6000} dots arrows={false} perView="basis-full md:basis-1/3">{dummyReviews.items.map((review) => <figure key={review.name} className="mx-2 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"><div className="flex gap-1 text-cyan-500">{[1, 2, 3, 4, 5].map((star) => <Sparkles key={star} className="size-4" aria-hidden="true" />)}</div><blockquote className="mt-5 leading-7 text-slate-600">“{review.text}”</blockquote><figcaption className="mt-5 font-bold text-slate-950">{review.name}</figcaption></figure>)}</Slider></div></section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"><div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-10"><SectionHeading eyebrow="The ISK journal" title={dummySeo.title} /><div className="mt-8 grid gap-8 md:grid-cols-2">{dummySeo.sections.slice(0, 4).map((section) => <article key={section.heading}><h3 className="text-lg font-black text-slate-900">{section.heading}</h3>{section.paragraphs.slice(0, 1).map((text) => <p key={text.slice(0, 24)} className="mt-3 text-sm leading-7 text-slate-500">{text}</p>)}</article>)}</div></div></section>

      <section aria-label="New arrivals" className="bg-gradient-to-r from-violet-50 via-white to-cyan-50 px-4 pb-16 sm:px-6"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-600">Just landed</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">New arrivals</h2></div><Link href="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-slate-950 transition hover:text-violet-600">Shop new <ArrowRight aria-hidden="true" /></Link></div>{dummyNewArrivals[0] && <Link href={dummyNewArrivals[0].href} className="group block overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_24px_70px_-35px_rgba(124,58,237,.45)]"><Img src={dummyNewArrivals[0].src} alt={dummyNewArrivals[0].alt} className="aspect-[3.6/1] w-full object-contain transition duration-700 group-hover:scale-[1.01]" /></Link>}</div></section>

      <section aria-label="Store promises" className="border-t border-slate-200 bg-white"><ul className="mx-auto grid max-w-6xl gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">{dummyFeatures.map((feature, i) => { const Icon = [Truck, ShieldCheck, Headphones, Eye][i] ?? Eye; return <li key={feature.title} className="flex items-center gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600"><Icon aria-hidden="true" /></span><div><h3 className="font-bold text-slate-950">{feature.title}</h3><p className="text-sm text-slate-500">{feature.body}</p></div></li> })}</ul></section>
    </main>
  )
}

