import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Slider } from '@/components/storefront/home/slider'
import {
  dummyBanners, dummyBrandLogos, dummyCategories, dummyFeatures, dummyNewArrivals, dummyPromoTiles,
  dummyReviews, dummySeo, dummyService, dummyTrending, dummyWhyChoose, type DummyProduct,
} from '@/lib/dummy/eyelenses-home'
import { formatPrice } from '@/lib/store-config'

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />
}

function DummyProductCard({ product }: { product: DummyProduct }) {
  const off = Math.round((1 - product.salePrice / product.price) * 100)
  return (
    <article className="group relative text-center">
      <span className="absolute left-2 top-2 z-10 rounded-full bg-[#b20000] px-2.5 py-1 text-xs font-bold text-white">-{off}%</span>
      <Link href={`/product/${product.slug}`} className="block overflow-hidden rounded-xl bg-[#eef3fa]">
        <Img src={product.image} alt={product.name} className="aspect-[5/6] w-full object-cover transition duration-300 group-hover:scale-105" />
      </Link>
      <h3 className="mt-3 text-sm font-semibold leading-5"><Link href={`/product/${product.slug}`} className="hover:text-[#033473]">{product.name}</Link></h3>
      <p className="mt-1 text-xs text-[#4a5568]">Dia: {product.dia}, Modality: {product.modality}</p>
      <p className="mt-1.5 text-sm">
        <del className="mr-2 text-[#4a5568]">{formatPrice(product.price, 'PKR')}</del>
        <strong className="text-[#033473]">{formatPrice(product.salePrice, 'PKR')}</strong>
      </p>
      <Link href={`/product/${product.slug}`} className="mt-3 inline-block rounded-full border border-[#033473] px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#033473] hover:bg-[#033473] hover:text-white">Select options</Link>
    </article>
  )
}

export function Home() {
  return (
    <>
      <section aria-label="Promotions" className="bg-[#eef3fa]">
        <Slider label="Promotional banners" autoPlayMs={6000} dots>
          {dummyBanners.map((banner) => (
            <Link key={banner.src} href={banner.href} className="block"><Img src={banner.src} alt={banner.alt} className="mx-auto w-full max-w-[1920px]" /></Link>
          ))}
        </Slider>
      </section>

      <section className="mx-auto grid max-w-[1320px] gap-4 px-4 pt-8 sm:grid-cols-2 sm:px-6">
        {dummyPromoTiles.map((tile) => (
          <Link key={tile.src} href={tile.href} className="block overflow-hidden rounded-2xl"><Img src={tile.src} alt={tile.alt} className="w-full transition duration-300 hover:scale-[1.02]" /></Link>
        ))}
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pt-14 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">Top Trending</h2>
          <Link href="/product-category/colored-lenses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#033473] hover:underline">View all <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4">
          {dummyTrending.map((product) => <DummyProductCard key={product.slug} product={product} />)}
        </div>
      </section>

      <section aria-label="Brands" className="mx-auto max-w-[1320px] px-4 pt-14 sm:px-6">
        <Slider label="Brands" autoPlayMs={3000} arrows={false} perView="basis-1/2 sm:basis-1/3 lg:basis-1/6">
          {dummyBrandLogos.map((brand) => (
            <Link key={brand.name} href={brand.href} className="mx-2 block rounded-xl border border-[#033473]/15 bg-white p-4 hover:border-[#033473]"><Img src={brand.src} alt={brand.name} className="mx-auto h-20 w-auto object-contain" /></Link>
          ))}
        </Slider>
      </section>

      <section className="mt-16 bg-[#eef3fa] py-14">
        <div className="mx-auto max-w-[1320px] px-4 text-center sm:px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-[#0a4fa3]">{dummyWhyChoose.eyebrow}</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-[#033473] sm:text-4xl">{dummyWhyChoose.heading}</h2>
          {dummyWhyChoose.lines.map((line) => <p key={line} className="mt-2 text-[#4a5568]">{line}</p>)}
          <ul className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {dummyWhyChoose.items.map((item) => (
              <li key={item.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <Img src={item.src} alt="" className="mx-auto size-20 object-contain" />
                <h3 className="mt-4 text-sm font-bold text-[#033473] sm:text-base">{item.title}</h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pt-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">{dummyCategories.heading}</h2>
        <p className="mt-2 text-[#4a5568]">{dummyCategories.intro}</p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {dummyCategories.items.map((item) => (
            <li key={item.alt}><Link href={item.href} className="block overflow-hidden rounded-2xl"><Img src={item.src} alt={item.alt} className="w-full transition duration-300 hover:scale-105" /></Link></li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-[1320px] px-4 sm:px-6">
        <div className="grid items-center gap-8 rounded-3xl bg-[#033473] p-8 text-white sm:p-12 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{dummyService.title}</h2>
            <p className="mt-4 leading-7 text-white/85">{dummyService.body}</p>
            <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#033473] hover:bg-[#dce8f8]">Shop now <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {dummyService.images.map((src) => <Img key={src} src={src} alt="" className="aspect-square w-full rounded-xl object-contain" />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 pt-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#033473] sm:text-3xl">{dummyReviews.heading}</h2>
        <p className="mt-2 text-[#4a5568]">{dummyReviews.intro}</p>
        <div className="mt-8">
          <Slider label="Customer reviews" autoPlayMs={6000} dots arrows={false} perView="basis-full md:basis-1/3">
            {dummyReviews.items.map((review) => (
              <figure key={review.name} className="mx-2 mb-10 h-[calc(100%-2.5rem)] rounded-2xl border border-[#033473]/15 bg-white p-6 text-left">
                <blockquote className="leading-7 text-[#4a5568]">“{review.text}”</blockquote>
                <figcaption className="mt-4 font-bold text-[#033473]">{review.name}</figcaption>
              </figure>
            ))}
          </Slider>
        </div>
      </section>

      <section className="mx-auto max-w-[1000px] px-4 pt-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-[#033473] sm:text-3xl">{dummySeo.title}</h2>
        <div className="mt-8 space-y-8">
          {dummySeo.sections.map((section) => (
            <article key={section.heading}>
              <h3 className="text-xl font-bold text-[#033473]">{section.heading}</h3>
              {section.paragraphs.map((text) => <p key={text.slice(0, 24)} className="mt-3 leading-7 text-[#4a5568]">{text}</p>)}
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 grid max-w-[1320px] gap-4 px-4 sm:px-6 md:grid-cols-2">
        {dummyNewArrivals.map((banner) => (
          <Link key={banner.src} href={banner.href} className="block overflow-hidden rounded-2xl"><Img src={banner.src} alt={banner.alt} className="w-full transition duration-300 hover:scale-[1.02]" /></Link>
        ))}
      </section>

      <section aria-label="Store promises" className="mt-16 border-y border-[#033473]/10 bg-[#eef3fa]">
        <ul className="mx-auto grid max-w-[1320px] gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {dummyFeatures.map((feature) => (
            <li key={feature.title} className="flex items-center gap-4">
              <Img src={feature.src} alt="" className="size-16 shrink-0 object-contain" />
              <div><h3 className="font-bold text-[#033473]">{feature.title}</h3><p className="text-sm text-[#4a5568]">{feature.body}</p></div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
