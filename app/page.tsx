'use client'

import { useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

const products = [
  { name: 'Forma Lounge Chair', category: 'Furniture', price: '$480.00', tone: 'sand', stock: '24 in stock' },
  { name: 'Arc Ceramic Vase', category: 'Home objects', price: '$68.00', tone: 'clay', stock: '12 in stock' },
  { name: 'Linea Table Lamp', category: 'Lighting', price: '$214.00', tone: 'ink', stock: '08 in stock' },
]

const orders = [
  { id: '#1048', customer: 'Maya Chen', item: 'Forma Lounge Chair', amount: '$480.00', status: 'Paid' },
  { id: '#1047', customer: 'Theo Martin', item: 'Arc Ceramic Vase', amount: '$68.00', status: 'Processing' },
  { id: '#1046', customer: 'Ava Williams', item: 'Linea Table Lamp', amount: '$214.00', status: 'Paid' },
  { id: '#1045', customer: 'Noah Kim', item: 'Forma Lounge Chair', amount: '$480.00', status: 'Shipped' },
]

export default function Page() {
  const [view, setView] = useState<'storefront' | 'admin'>('storefront')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-[#1c1c1a]">
      <header className="sticky top-0 z-20 border-b border-[#1c1c1a]/10 bg-[#f6f5f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <button aria-label="Toggle navigation" className="rounded-full p-2 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X /> : <Menu />}
            </button>
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-[#1c1c1a] text-[#f6f5f2]"><Sparkles size={15} /></div>
              <span className="text-lg font-semibold tracking-[-0.04em]">morrow.</span>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded-full border border-[#1c1c1a]/10 bg-white/60 p-1 md:flex">
            <button onClick={() => setView('storefront')} className={`rounded-full px-4 py-2 text-xs font-medium transition ${view === 'storefront' ? 'bg-[#1c1c1a] text-white' : 'text-[#6d6c67]'}`}>Storefront</button>
            <button onClick={() => setView('admin')} className={`rounded-full px-4 py-2 text-xs font-medium transition ${view === 'admin' ? 'bg-[#1c1c1a] text-white' : 'text-[#6d6c67]'}`}>Admin workspace</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden rounded-full p-2 text-[#6d6c67] hover:bg-white md:block" aria-label="Notifications"><Bell size={18} /></button>
            <div className="grid size-9 place-items-center rounded-full bg-[#d9a78c] text-xs font-semibold">AM</div>
            <ChevronDown size={15} className="text-[#6d6c67]" />
          </div>
        </div>
      </header>

      {view === 'storefront' ? <Storefront /> : <Admin />}

      {mobileOpen && <div className="fixed inset-x-0 top-[72px] z-10 border-b border-[#1c1c1a]/10 bg-[#f6f5f2] p-4 md:hidden"><div className="flex gap-2"><button onClick={() => { setView('storefront'); setMobileOpen(false) }} className={`flex-1 rounded-full px-4 py-3 text-sm ${view === 'storefront' ? 'bg-[#1c1c1a] text-white' : 'bg-white'}`}>Storefront</button><button onClick={() => { setView('admin'); setMobileOpen(false) }} className={`flex-1 rounded-full px-4 py-3 text-sm ${view === 'admin' ? 'bg-[#1c1c1a] text-white' : 'bg-white'}`}>Admin workspace</button></div></div>}
    </main>
  )
}

function Storefront() {
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10">
    <nav className="flex items-center justify-between py-5 text-sm"><div className="flex gap-6 text-[#6d6c67]"><a className="text-[#1c1c1a]" href="#shop">Shop all</a><a href="#new">New in</a><a href="#journal">Journal</a></div><button className="flex items-center gap-2 rounded-full border border-[#1c1c1a]/15 bg-white/60 px-4 py-2 text-sm"><ShoppingBag size={16} /> Bag (0)</button></nav>
    <section className="grid overflow-hidden rounded-[28px] bg-[#dfe3dc] lg:grid-cols-[1.05fr_.95fr]">
      <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16"><div><p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6a7568]">Objects for slower living</p><h1 className="max-w-[600px] text-5xl font-medium leading-[.95] tracking-[-0.07em] sm:text-7xl">Make room for <em className="font-serif font-normal">better.</em></h1><p className="mt-7 max-w-[380px] text-base leading-7 text-[#636b62]">Thoughtful essentials for everyday rituals. Designed to be lived with, not just looked at.</p><button className="mt-9 flex items-center gap-3 rounded-full bg-[#1c1c1a] px-6 py-3.5 text-sm font-medium text-white">Explore the collection <ArrowUpRight size={16} /></button></div><div className="mt-16 flex gap-8 text-xs text-[#697367]"><span>Free shipping over $150</span><span>14 day returns</span></div></div>
      <div className="relative min-h-[400px] overflow-hidden bg-[#c4cbc1]"><div className="absolute left-[15%] top-[10%] h-[75%] w-[58%] rotate-[-7deg] rounded-[48%_48%_8%_8%] bg-[#e8e4da] shadow-2xl shadow-[#718071]/30" /><div className="absolute left-[23%] top-[22%] h-[35%] w-[42%] rounded-[50%] bg-[#f4f0e5] shadow-inner" /><div className="absolute bottom-[12%] left-[12%] h-8 w-[70%] rounded-[50%] bg-[#8e9a8b]/40 blur-xl" /><span className="absolute bottom-8 right-8 text-xs uppercase tracking-[.2em] text-[#657064]">Collection 01 / 04</span></div>
    </section>
    <section id="shop" className="pt-20"><div className="mb-8 flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#8c8a82]">The edit</p><h2 className="mt-2 text-3xl font-medium tracking-[-.05em]">Made to stay.</h2></div><a className="text-sm underline underline-offset-4" href="#all">View all pieces</a></div><div className="grid gap-5 md:grid-cols-3">{products.map((product) => <ProductCard key={product.name} product={product} />)}</div></section>
  </div>
}

function ProductCard({ product }: { product: (typeof products)[number] }) {
  return <article><div className={`product-art product-${product.tone} group relative flex aspect-[.92] items-end overflow-hidden rounded-2xl p-5`}><button aria-label={`Add ${product.name} to bag`} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/80 text-lg opacity-0 transition group-hover:opacity-100">+</button><span className="rounded-full bg-white/75 px-3 py-1.5 text-[10px] uppercase tracking-[.16em]">{product.category}</span></div><div className="mt-4 flex items-start justify-between"><div><h3 className="text-sm font-medium">{product.name}</h3><p className="mt-1 text-xs text-[#8c8a82]">{product.stock}</p></div><span className="text-sm">{product.price}</span></div></article>
}

function Admin() {
  return <div className="mx-auto flex max-w-[1440px] gap-8 px-5 py-8 lg:px-10"><aside className="hidden w-52 shrink-0 flex-col justify-between lg:flex"><div><p className="mb-7 text-xs font-medium uppercase tracking-[.2em] text-[#9a9890]">Workspace</p><div className="flex flex-col gap-1 text-sm"><SideLink icon={<LayoutDashboard />} label="Overview" active /><SideLink icon={<Package />} label="Products" /><SideLink icon={<ShoppingBag />} label="Orders" /><SideLink icon={<Users />} label="Customers" /><SideLink icon={<BarChart3 />} label="Analytics" /></div></div><div className="flex items-center gap-2 border-t border-[#1c1c1a]/10 pt-5 text-xs text-[#7c7a73]"><Settings2 size={15} /> Settings</div></aside><section className="min-w-0 flex-1"><div className="mb-8 flex items-start justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#9a9890]">Tuesday, October 7, 2026</p><h1 className="mt-2 text-4xl font-medium tracking-[-.06em]">Good morning, Alex.</h1></div><button className="flex items-center gap-2 rounded-full bg-[#1c1c1a] px-4 py-2.5 text-sm text-white"><Plus size={16} /> Add product</button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={<CircleDollarSign />} label="Gross revenue" value="$24,892" change="+18.2%" /><Metric icon={<ShoppingBag />} label="Orders" value="184" change="+12.4%" /><Metric icon={<Users />} label="Customers" value="1,284" change="+8.1%" /><Metric icon={<BarChart3 />} label="Conversion" value="4.82%" change="+1.2%" /></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><div className="rounded-2xl border border-[#1c1c1a]/10 bg-white/70 p-6"><div className="flex items-center justify-between"><div><h2 className="font-medium">Revenue overview</h2><p className="mt-1 text-xs text-[#9a9890]">Last 30 days</p></div><button className="rounded-full border border-[#1c1c1a]/10 px-3 py-1.5 text-xs">30 days <ChevronDown size={13} className="ml-1 inline" /></button></div><div className="mt-8 flex h-48 items-end gap-2 sm:gap-4">{[32,42,38,55,48,62,54,72,66,78,70,92,84,100].map((height, index) => <div key={index} className="group flex flex-1 flex-col items-center gap-2"><div style={{ height: `${height}%` }} className={`w-full rounded-t-md transition ${index === 13 ? 'bg-[#1c1c1a]' : 'bg-[#d9dfd5] group-hover:bg-[#aebaad]'}`} /><span className="text-[9px] text-[#aaa79e]">{index % 3 === 0 ? `Sep ${8 + index}` : ''}</span></div>)}</div></div><div className="rounded-2xl bg-[#dfe3dc] p-6"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-[#687467]">Top product</p><h2 className="mt-3 text-xl font-medium tracking-[-.04em]">Forma Lounge Chair</h2></div><ArrowUpRight size={18} /></div><div className="product-art product-sand mt-8 aspect-[1.3] rounded-xl" /><div className="mt-4 flex justify-between text-sm"><span>124 units sold</span><span className="font-medium">$59.5k</span></div></div></div><div className="mt-6 rounded-2xl border border-[#1c1c1a]/10 bg-white/70 p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-medium">Recent orders</h2><p className="mt-1 text-xs text-[#9a9890]">Keep an eye on the latest activity</p></div><button className="text-xs underline underline-offset-4">View all orders</button></div><div className="mb-4 flex items-center gap-3 rounded-xl bg-[#f6f5f2] px-4 py-2.5 text-sm text-[#9a9890]"><Search size={16} /><input className="w-full bg-transparent outline-none placeholder:text-[#aaa79e]" placeholder="Search orders or customers" /></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[.16em] text-[#aaa79e]"><tr><th className="pb-3 font-medium">Order</th><th className="pb-3 font-medium">Customer</th><th className="pb-3 font-medium">Item</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-[#1c1c1a]/8"><td className="py-4 font-medium">{order.id}</td><td className="py-4">{order.customer}</td><td className="py-4 text-[#77756e]">{order.item}</td><td className="py-4">{order.amount}</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] ${order.status === 'Paid' ? 'bg-[#dfe9db] text-[#4e6b4d]' : order.status === 'Shipped' ? 'bg-[#e6e1f0] text-[#6b588b]' : 'bg-[#f1e4cd] text-[#8c6b3e]'}`}>{order.status}</span></td></tr>)}</tbody></table></div></div></section></div>
}

function SideLink({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) { return <button className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-white font-medium shadow-sm' : 'text-[#77756e]'}`}>{icon}<span>{label}</span></button> }
function Metric({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string; change: string }) { return <div className="rounded-2xl border border-[#1c1c1a]/10 bg-white/70 p-5"><div className="flex items-center justify-between"><span className="text-[#77756e]">{icon}</span><span className="text-[10px] font-medium text-[#688265]">{change}</span></div><p className="mt-5 text-xs text-[#9a9890]">{label}</p><p className="mt-1 text-2xl font-medium tracking-[-.05em]">{value}</p></div> }
