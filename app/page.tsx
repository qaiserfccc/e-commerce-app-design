'use client'

import { useMemo, useState } from 'react'
import { useProducts } from '@/lib/hooks/use-storefront-data'
import { useAdminMetrics } from '@/lib/hooks/use-admin-data'
import { ProjectKanban } from '@/components/admin/project-kanban'
import { ArrowRight, BarChart3, Bell, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, LayoutDashboard, Menu, Package, Plus, Search, ShoppingBag, Sparkles, Star, Users, X } from 'lucide-react'

const slides = [
  { eyebrow: 'The soft edit', title: 'A quieter way to live.', copy: 'New textures, considered forms, and daily objects made to last.', cta: 'Shop new arrivals', tone: 'slide-sage' },
  { eyebrow: 'Bundle & save', title: 'Small rituals, better together.', copy: 'Pair your everyday favorites and save 15% on the full set.', cta: 'Explore bundles', tone: 'slide-clay' },
  { eyebrow: 'Limited release', title: 'The Sunday collection.', copy: 'Exclusive pieces designed for slow mornings and long evenings.', cta: 'View exclusive pieces', tone: 'slide-ink' },
]

export default function Page() {
  const [view, setView] = useState<'storefront' | 'admin'>('storefront')
  const [mobileOpen, setMobileOpen] = useState(false)
  return <main className="min-h-screen bg-[#f6f5f2] text-[#1c1c1a]">
    <header className="sticky top-0 z-30 border-b border-[#1c1c1a]/10 bg-[#f6f5f2]/90 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
      <div className="flex items-center gap-3"><button aria-label="Toggle navigation" className="rounded-full p-2 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button><div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-full bg-[#1c1c1a] text-[#f6f5f2]"><Sparkles size={15} /></div><span className="text-lg font-semibold tracking-[-.04em]">morrow.</span></div></div>
      <div className="hidden items-center gap-1 rounded-full border border-[#1c1c1a]/10 bg-white/60 p-1 md:flex"><button onClick={() => setView('storefront')} className={`rounded-full px-4 py-2 text-xs font-medium transition ${view === 'storefront' ? 'bg-[#1c1c1a] text-white' : 'text-[#6d6c67]'}`}>Storefront</button><button onClick={() => setView('admin')} className={`rounded-full px-4 py-2 text-xs font-medium transition ${view === 'admin' ? 'bg-[#1c1c1a] text-white' : 'text-[#6d6c67]'}`}>Admin workspace</button></div>
      <div className="flex items-center gap-2"><button className="hidden rounded-full p-2 text-[#6d6c67] hover:bg-white md:block" aria-label="Notifications"><Bell size={18} /></button><div className="grid size-9 place-items-center rounded-full bg-[#d9a78c] text-xs font-semibold">AM</div></div>
    </div></header>
    {view === 'storefront' ? <Storefront /> : <Admin />}
    {mobileOpen && <div className="fixed inset-x-0 top-[72px] z-20 border-b border-[#1c1c1a]/10 bg-[#f6f5f2] p-4 md:hidden"><div className="flex gap-2"><button onClick={() => { setView('storefront'); setMobileOpen(false) }} className="flex-1 rounded-full bg-[#1c1c1a] px-4 py-3 text-sm text-white">Storefront</button><button onClick={() => { setView('admin'); setMobileOpen(false) }} className="flex-1 rounded-full bg-white px-4 py-3 text-sm">Admin</button></div></div>}
  </main>
}

function Storefront() {
  const { products: dbProducts, isLoading } = useProducts()
  const [slide, setSlide] = useState(0)
  const products = useMemo(() => dbProducts.map((product, index) => ({ ...product, tone: ['sand', 'clay', 'ink', 'sage'][index % 4] })), [dbProducts])
  const categories = [...new Set(products.map((product) => product.category))]
  const featured = products.slice(0, 4)
  const bestSellers = products.slice(1, 5)
  const deals = products.filter((product) => product.status === 'sale' || product.status === 'active').slice(0, 4)
  return <div className="mx-auto max-w-[1440px] px-5 pb-24 lg:px-10">
    <nav className="flex items-center justify-between py-5 text-sm"><div className="flex gap-6 text-[#6d6c67]"><a className="text-[#1c1c1a]" href="#new">Shop all</a><a href="#new">New in</a><a href="#reviews">Reviews</a><a className="hidden sm:block" href="#journal">Journal</a></div><div className="flex items-center gap-2"><button className="hidden rounded-full border border-[#1c1c1a]/10 bg-white/70 p-2.5 sm:block" aria-label="Search"><Search size={16} /></button><button className="flex items-center gap-2 rounded-full border border-[#1c1c1a]/15 bg-white/60 px-4 py-2"><ShoppingBag size={16} /> Bag (0)</button></div></nav>
    <section className={`relative grid min-h-[480px] overflow-hidden rounded-[30px] transition-colors lg:grid-cols-[.9fr_1.1fr] ${slides[slide].tone}`}><div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16"><div><p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] opacity-65">{slides[slide].eyebrow}</p><h1 className="max-w-[620px] text-5xl font-medium leading-[.94] tracking-[-.075em] sm:text-7xl">{slides[slide].title}</h1><p className="mt-7 max-w-[390px] text-base leading-7 opacity-70">{slides[slide].copy}</p><button className="mt-9 flex items-center gap-3 rounded-full bg-[#1c1c1a] px-6 py-3.5 text-sm font-medium text-white">{slides[slide].cta}<ArrowRight size={16} /></button></div><div className="flex items-center gap-3 text-xs opacity-65"><span>{String(slide + 1).padStart(2, '0')}</span><div className="h-px w-16 bg-current/40" /><span>03</span></div></div><div className="relative min-h-[320px] overflow-hidden"><div className="hero-orb absolute left-[18%] top-[12%] h-[72%] w-[58%] rotate-[-8deg] rounded-[48%_48%_10%_10%]" /><div className="absolute left-[28%] top-[22%] h-[36%] w-[38%] rounded-full bg-white/45 shadow-inner" /><div className="absolute bottom-[12%] left-[12%] h-8 w-[70%] rounded-full bg-black/15 blur-xl" /><button onClick={() => setSlide((slide + slides.length - 1) % slides.length)} aria-label="Previous slide" className="absolute bottom-7 left-7 grid size-10 place-items-center rounded-full border border-current/20 bg-white/35"><ChevronLeft size={16} /></button><button onClick={() => setSlide((slide + 1) % slides.length)} aria-label="Next slide" className="absolute bottom-7 left-[76px] grid size-10 place-items-center rounded-full border border-current/20 bg-white/35"><ChevronRight size={16} /></button></div></section>
    <div className="flex flex-wrap gap-2 py-7">{['All pieces', ...categories].map((category) => <button key={category} className="rounded-full border border-[#1c1c1a]/10 bg-white/60 px-4 py-2 text-xs">{category}</button>)}</div>
    {isLoading ? <p className="py-20 text-center text-sm text-[#8c8a82]">Loading the latest collection...</p> : products.length === 0 ? <p className="py-20 text-center text-sm text-[#8c8a82]">Your collection is ready for its first product.</p> : <><ProductSection id="new" label="Just landed" title="New arrivals" products={featured} /><ProductSection label="Loved by many" title="Best sellers" products={bestSellers} /><ProductSection label="Good things, less" title="Current deals" products={deals} /></>}
    <section id="reviews" className="mt-24 rounded-[28px] bg-[#e2e7df] p-8 sm:p-12"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs uppercase tracking-[.2em] text-[#6d786b]">From our community</p><h2 className="mt-2 max-w-lg text-4xl font-medium tracking-[-.06em]">Objects that earn their place.</h2></div><div className="flex items-center gap-2 text-sm"><span className="text-2xl font-medium">4.9</span><span className="flex gap-0.5 text-[#bd8d59]">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill="currentColor" />)}</span><span className="text-xs opacity-60">from 248 reviews</span></div></div><div className="mt-10 grid gap-4 md:grid-cols-3"><Review quote="The kind of piece that makes the whole room feel more considered." name="Maya C." item="Forma Lounge Chair" /><Review quote="Beautifully made, beautifully packed, and here sooner than expected." name="Theo M." item="Arc Ceramic Vase" /><Review quote="It is simple, warm, and exactly what our home was missing." name="Ava W." item="Linea Table Lamp" /></div></section>
  </div>
}

function ProductSection({ id, label, title, products }: { id?: string; label: string; title: string; products: any[] }) { return <section id={id} className="pt-16"><div className="mb-7 flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#8c8a82]">{label}</p><h2 className="mt-2 text-3xl font-medium tracking-[-.06em]">{title}</h2></div><a href="#new" className="hidden text-sm underline underline-offset-4 sm:block">View all</a></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section> }
function ProductCard({ product }: { product: any }) { return <article className="group"><div className={`product-art product-${product.tone} relative flex aspect-[.9] items-end overflow-hidden rounded-2xl p-4`}><button aria-label={`Add ${product.name} to bag`} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/85 text-lg opacity-0 transition group-hover:opacity-100">+</button><span className="rounded-full bg-white/75 px-3 py-1.5 text-[10px] uppercase tracking-[.16em]">{product.category}</span></div><div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="text-sm font-medium">{product.name}</h3><p className="mt-1 text-xs text-[#8c8a82]">{product.stockQuantity} in stock</p></div><span className="text-sm">{product.currency === 'USD' ? '$' : product.currency}{product.price}</span></div></article> }
function Review({ quote, name, item }: { quote: string; name: string; item: string }) { return <blockquote className="rounded-2xl bg-white/65 p-5"><div className="mb-5 flex gap-0.5 text-[#bd8d59]">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={13} fill="currentColor" />)}</div><p className="text-sm leading-6">“{quote}”</p><footer className="mt-6 text-xs text-[#777d74]"><strong className="font-medium text-[#1c1c1a]">{name}</strong><span className="mx-2">/</span>{item}</footer></blockquote> }

function Admin() {
  const [section, setSection] = useState<'overview' | 'project-plan'>('overview')
  return <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 lg:flex-row lg:px-10">
    <aside className="w-full shrink-0 lg:w-52">
      <p className="mb-3 text-xs uppercase tracking-[.2em] text-[#9a9890] lg:mb-7">Workspace</p>
      <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 lg:flex lg:flex-col">
        <button onClick={() => setSection('overview')} aria-current={section === 'overview' ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${section === 'overview' ? 'bg-white font-medium shadow-sm' : 'text-[#77756e]'}`}><LayoutDashboard size={18} /><span>Overview</span></button>
        <SideLink icon={<Package />} label="Products" />
        <SideLink icon={<ShoppingBag />} label="Orders" />
        <SideLink icon={<Users />} label="Customers" />
        <SideLink icon={<BarChart3 />} label="Analytics" />
        <button onClick={() => setSection('project-plan')} aria-current={section === 'project-plan' ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${section === 'project-plan' ? 'bg-white font-medium shadow-sm' : 'text-[#77756e]'}`}><ClipboardList size={18} /><span>Project Kanban</span></button>
      </div>
    </aside>
    {section === 'project-plan' ? <ProjectKanban /> : <AdminOverview />}
  </div>
}
function AdminOverview() {
  const { metrics } = useAdminMetrics()
  const revenue = metrics?.orders.totalRevenue ? `$${Number(metrics.orders.totalRevenue).toLocaleString()}` : '$0'
  return <section className="min-w-0 flex-1">
    <div className="mb-8 flex items-start justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#9a9890]">Live workspace</p><h1 className="mt-2 text-4xl font-medium tracking-[-.06em]">Good morning, Alex.</h1></div><button className="flex items-center gap-2 rounded-full bg-[#1c1c1a] px-4 py-2.5 text-sm text-white"><Plus size={16} /> Add product</button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<CircleDollarSign />} label="Gross revenue" value={revenue} /><Metric icon={<ShoppingBag />} label="Orders" value={String(metrics?.orders.totalOrders ?? 0)} /><Metric icon={<Users />} label="Customers" value={String(metrics?.customers.totalCustomers ?? 0)} /></div>
    <div className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white/70 p-6"><h2 className="font-medium">Storefront sync</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#77756e]">Products, inventory, categories, and pricing are read from the connected Neon database. Changes made here revalidate the storefront automatically.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-[#e2e7df] px-3 py-1.5 text-xs text-[#52624f]">Database connected</span><span className="rounded-full bg-[#e2e7df] px-3 py-1.5 text-xs text-[#52624f]">SWR refresh active</span></div></div>
  </section>
}
function SideLink({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) { return <button className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-white font-medium shadow-sm' : 'text-[#77756e]'}`}>{icon}<span>{label}</span></button> }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl border border-[#1c1c1a]/10 bg-white/70 p-5"><span className="text-[#77756e]">{icon}</span><p className="mt-5 text-xs text-[#9a9890]">{label}</p><p className="mt-1 text-2xl font-medium tracking-[-.05em]">{value}</p></div> }

// Visual product artwork is intentionally CSS-based so the storefront remains fast while product media can be supplied from Blob through the database.
