'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import useSWR from 'swr'
import { ArrowDownRight, ArrowUpRight, BarChart3, Check, ChevronRight, CircleHelp, ExternalLink, ListChecks, PlugZap, Plus, RefreshCw, Save, ShieldCheck, ShoppingBag, Users } from 'lucide-react'
import type { AdminSectionId } from '@/lib/admin-sections'
import { reportError } from '@/lib/ui/notifications'

type EventMetric = { count: number; sessions: number; value: string }
type GrowthMetrics = {
  days: number
  since: string
  events: Record<string, EventMetric>
  dailyPageViews: Array<{ day: string; pageViews: number; sessions: number }>
  topPages: Array<{ pagePath: string; views: number; sessions: number }>
  orders: number
}
type IntegrationConfig = {
  metaPixelId: string
  ga4MeasurementId: string
  gtmContainerId: string
  googleAdsConversionId: string
  googleAdsConversionLabel: string
  tiktokPixelId: string
}
type CroAction = {
  id: string
  title: string
  hypothesis: string
  pagePath: string
  status: 'todo' | 'in_progress' | 'done'
  createdAt: string
}

const initialConfig: IntegrationConfig = {
  metaPixelId: '',
  ga4MeasurementId: '',
  gtmContainerId: '',
  googleAdsConversionId: '',
  googleAdsConversionLabel: '',
  tiktokPixelId: '',
}

async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'))
  if (!response.ok) throw new Error(body.error || 'The growth workspace could not be loaded.')
  return body
}

function PanelHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-.04em] text-[#15384d]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526b7b]">{description}</p>
      </div>
      {action}
    </div>
  )
}

function WorkNavigation({ active }: { active: AdminSectionId }) {
  const links: Array<{ id: AdminSectionId; label: string; icon: typeof BarChart3 }> = [
    { id: 'cro-overview', label: 'Overview', icon: BarChart3 },
    { id: 'cro-funnel', label: 'Conversion funnel', icon: ArrowDownRight },
    { id: 'cro-actions', label: 'Action board', icon: ListChecks },
    { id: 'marketing-integrations', label: 'Integrations', icon: PlugZap },
  ]
  return (
    <nav aria-label="Growth workspace" className="mb-7 flex flex-wrap gap-2 border-b border-[#cfe2eb] pb-3">
      {links.map(({ id, label, icon: Icon }) => (
        <Link key={id} href={`/admin/${id}`} aria-current={active === id ? 'page' : undefined}
          className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] ${active === id ? 'bg-[#006f9b] text-white' : 'bg-white text-[#15384d] hover:bg-[#e8f6fb]'}`}>
          <Icon size={15} aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  )
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof BarChart3 }) {
  return (
    <div className="min-w-0 border-b border-[#cfe2eb] py-4 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
      <div className="flex items-center gap-2 text-sm text-[#526b7b]"><Icon size={16} aria-hidden="true" />{label}</div>
      <p className="mt-3 text-3xl font-semibold tracking-[-.04em] text-[#15384d]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#526b7b]">{note}</p>
    </div>
  )
}

function useGrowthMetrics(days: number) {
  const { data, error, isLoading, mutate } = useSWR<{ data: GrowthMetrics }>(`/api/admin/growth-metrics?days=${days}`, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  })
  return { metrics: data?.data, error, isLoading, mutate }
}

function eventMetric(metrics: GrowthMetrics | undefined, name: string): EventMetric {
  return metrics?.events[name] ?? { count: 0, sessions: 0, value: '0' }
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? `${((numerator / denominator) * 100).toFixed(1)}%` : '—'
}

function LoadingPanel({ label }: { label: string }) {
  return <div role="status" aria-label={label} className="space-y-3">{[0, 1, 2].map((row) => <div key={row} className="h-14 animate-pulse rounded-xl bg-[#e8f6fb]" />)}</div>
}

function ErrorPanel({ error }: { error: unknown }) {
  return <div role="alert" className="rounded-xl border border-[#b4233e]/25 bg-[#fff4f5] px-4 py-3 text-sm text-[#8d2337]">{error instanceof Error ? error.message : 'Growth analytics are unavailable. Refresh to try again.'}</div>
}

function Overview({ section }: { section: AdminSectionId }) {
  const [days, setDays] = useState(30)
  const { metrics, error, isLoading, mutate } = useGrowthMetrics(days)
  const pageViews = eventMetric(metrics, 'page_view')
  const addToCart = eventMetric(metrics, 'add_to_cart')
  const checkouts = eventMetric(metrics, 'begin_checkout')
  const purchases = eventMetric(metrics, 'purchase')
  const hasEvents = Boolean(metrics && Object.values(metrics.events).some((item) => item.count > 0))
  const maximum = Math.max(1, ...(metrics?.dailyPageViews.map((item) => item.pageViews) ?? []))
  return (
    <section className="min-w-0 flex-1">
      <div hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: '<!--\nTHESIS: Diagnose real storefront friction before choosing a conversion change; never dress missing tracking as a result.\nOWN-WORLD: ISK Lenses cool-paper work surface, ink-blue structure, sky-blue measurements, and compact task-first controls.\nSTORY: Operators see consented journey signals, compare funnel stages, record actions, and configure provider IDs without exposing secrets.\nFIRST VIEWPORT: Growth navigation sits above a compact KPI strip, followed by the actual daily visit series and a direct link to the funnel.\nFORM: Extend the existing admin workspace in its established Operate system; no invented metrics or claims.\n-->' }} />
      <WorkNavigation active={section} />
      <PanelHeading title="Growth overview" description="A first-party view of storefront activity and orders. Browser events are recorded only after analytics consent; order counts come from the store database." action={
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="growth-period">Reporting period</label>
          <select id="growth-period" value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-10 rounded-xl border border-[#b8d4e0] bg-white px-3 text-sm text-[#15384d]">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <button type="button" onClick={() => void mutate()} aria-label="Refresh growth metrics" className="grid size-10 place-items-center rounded-full border border-[#cfe2eb] bg-white hover:bg-[#e8f6fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]"><RefreshCw size={16} /></button>
        </div>
      } />
      {error ? <ErrorPanel error={error} /> : isLoading || !metrics ? <LoadingPanel label="Loading growth metrics" /> : (
        <>
          <section aria-label={`Storefront signals for the last ${days} days`} className="grid gap-x-1 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Consented visits" value={pageViews.sessions.toLocaleString()} note={`${pageViews.count.toLocaleString()} page views`} icon={Users} />
            <Stat label="Product views" value={eventMetric(metrics, 'view_item').sessions.toLocaleString()} note="Unique sessions with a product view" icon={BarChart3} />
            <Stat label="Added to bag" value={addToCart.sessions.toLocaleString()} note={`${percent(addToCart.sessions, pageViews.sessions)} of visit sessions`} icon={ShoppingBag} />
            <Stat label="Store orders" value={metrics.orders.toLocaleString()} note={`${purchases.sessions.toLocaleString()} consented purchase events`} icon={Check} />
          </section>
          {!hasEvents && (
            <section className="mt-7 rounded-2xl border border-[#cfe2eb] bg-white p-5">
              <h2 className="font-semibold text-[#15384d]">Your first-party funnel is waiting for consented visits</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#526b7b]">Events appear after a shopper allows optional analytics. Configure at least one provider, then test in a fresh browser session and confirm that declining optional analytics records no visit events.</p>
              <Link href="/admin/marketing-integrations" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#006f9b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005d83]">Set up integrations <ChevronRight size={16} /></Link>
            </section>
          )}
          <section className="mt-7 grid gap-8 rounded-2xl border border-[#cfe2eb] bg-white p-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-semibold text-[#15384d]">Daily consented page views</h2><p className="mt-1 text-xs text-[#526b7b]">Counts are first-party events, not provider-reported sessions.</p></div>
                <span className="text-xs text-[#526b7b]">Last {days} days</span>
              </div>
              {metrics.dailyPageViews.length ? (
                <div className="mt-6 grid min-h-44 grid-cols-7 items-end gap-2 sm:grid-cols-10 lg:grid-cols-14" aria-label="Daily page view bars">
                  {metrics.dailyPageViews.slice(-14).map((item) => (
                    <div key={item.day} className="group flex h-full flex-col items-center justify-end gap-2">
                      <span className="text-xs text-[#526b7b]">{item.pageViews}</span>
                      <div title={`${item.pageViews} views, ${item.sessions} sessions on ${item.day}`} className="w-full min-w-2 rounded-t-md bg-[#087ba5]" style={{ height: `${Math.max(4, item.pageViews / maximum * 100)}%` }} />
                      <time className="text-xs text-[#526b7b]" dateTime={item.day}>{item.day.slice(5)}</time>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-7 text-sm text-[#526b7b]">No page-view events in this period.</p>}
            </div>
            <div className="border-t border-[#cfe2eb] pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              <h2 className="font-semibold text-[#15384d]">Where sessions begin</h2>
              <p className="mt-1 text-xs text-[#526b7b]">Top paths by consented page views.</p>
              {metrics.topPages.length ? (
                <ol className="mt-4 divide-y divide-[#cfe2eb]">
                  {metrics.topPages.slice(0, 6).map((item) => <li key={item.pagePath} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 truncate font-medium text-[#15384d]" title={item.pagePath}>{item.pagePath}</span><span className="shrink-0 text-xs text-[#526b7b]">{item.views} views · {item.sessions} sessions</span></li>)}
                </ol>
              ) : <p className="mt-4 text-sm text-[#526b7b]">No pages to rank yet.</p>}
            </div>
          </section>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <Link href="/admin/cro-funnel" className="group flex items-start justify-between gap-4 rounded-2xl border border-[#cfe2eb] bg-white p-5 hover:bg-[#f7fcff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]">
              <span><strong className="block text-[#15384d]">Inspect the conversion funnel</strong><span className="mt-1 block text-sm leading-5 text-[#526b7b]">Compare product views, cart activity, checkout starts, and completed orders.</span></span><ArrowUpRight size={18} className="shrink-0 text-[#006f9b]" />
            </Link>
            <Link href="/admin/cro-actions" className="group flex items-start justify-between gap-4 rounded-2xl border border-[#cfe2eb] bg-white p-5 hover:bg-[#f7fcff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5]">
              <span><strong className="block text-[#15384d]">Turn findings into actions</strong><span className="mt-1 block text-sm leading-5 text-[#526b7b]">Record a hypothesis, page, owner decision, and status before changing the storefront.</span></span><ArrowUpRight size={18} className="shrink-0 text-[#006f9b]" />
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

function Funnel({ section }: { section: AdminSectionId }) {
  const [days, setDays] = useState(30)
  const { metrics, error, isLoading } = useGrowthMetrics(days)
  const stages = [
    { key: 'page_view', label: 'Visited a page', description: 'Unique sessions with one or more page views.' },
    { key: 'view_item', label: 'Viewed a product', description: 'Unique sessions that opened a product detail page.' },
    { key: 'add_to_cart', label: 'Added to bag', description: 'Unique sessions with at least one add-to-bag event.' },
    { key: 'begin_checkout', label: 'Started checkout', description: 'Unique sessions that opened checkout.' },
    { key: 'purchase', label: 'Completed an order', description: 'Consent-gated browser events after a successful order response.' },
  ]
  return (
    <section className="min-w-0 flex-1">
      <WorkNavigation active={section} />
      <PanelHeading title="Conversion funnel" description="Unique sessions with each consented browser event in the selected window. A session can appear in more than one stage; these are directional stage rates, not a user-level attribution model." action={
        <select aria-label="Funnel reporting period" value={days} onChange={(event) => setDays(Number(event.target.value))} className="min-h-10 rounded-xl border border-[#b8d4e0] bg-white px-3 text-sm text-[#15384d]"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
      } />
      {error ? <ErrorPanel error={error} /> : isLoading || !metrics ? <LoadingPanel label="Loading conversion funnel" /> : (
        <>
          <div className="rounded-2xl border border-[#cfe2eb] bg-white px-5">
            {stages.map((stage, index) => {
              const stageValue = eventMetric(metrics, stage.key).sessions
              const previous = index === 0 ? stageValue : eventMetric(metrics, stages[index - 1].key).sessions
              return (
                <div key={stage.key} className="grid gap-3 border-b border-[#cfe2eb] py-5 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div><h2 className="font-semibold text-[#15384d]">{stage.label}</h2><p className="mt-1 text-sm leading-5 text-[#526b7b]">{stage.description}</p></div>
                  <strong className="text-2xl tracking-[-.03em] text-[#15384d]">{stageValue.toLocaleString()}</strong>
                  <span className="inline-flex items-center gap-1 text-sm text-[#526b7b]">{index === 0 ? 'Starting point' : <><ArrowDownRight size={14} /> {percent(stageValue, previous)} of prior stage</>}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#cfe2eb] bg-white p-5"><h2 className="font-semibold text-[#15384d]">Store orders</h2><p className="mt-2 text-3xl font-semibold text-[#15384d]">{metrics.orders.toLocaleString()}</p><p className="mt-1 text-sm text-[#526b7b]">Orders created in this period, independent of analytics consent.</p></div>
            <div className="rounded-2xl border border-[#cfe2eb] bg-[#e8f6fb] p-5"><h2 className="font-semibold text-[#15384d]">Interpretation</h2><p className="mt-2 text-sm leading-6 text-[#526b7b]">Consent opt-out, blocked scripts, mobile-app orders, and direct receipt visits can make browser events differ from order records. Use the store's Orders page as the source of truth for placed orders.</p></div>
          </div>
        </>
      )}
    </section>
  )
}

function Actions({ section, canEdit }: { section: AdminSectionId; canEdit: boolean }) {
  const { data, error, isLoading, mutate } = useSWR<{ data: CroAction[] }>('/api/admin/cro-actions', fetcher)
  const [title, setTitle] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [pagePath, setPagePath] = useState('/shop')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const actions = data?.data ?? []

  async function persist(next: CroAction[]) {
    setSaving(true)
    setSaveError('')
    try {
      const response = await fetch('/api/admin/cro-actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: next }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save this action.')
      await mutate({ data: result.data }, { revalidate: false })
    } catch (errorValue) {
      setSaveError(reportError(errorValue, 'Could not save this action.'))
    } finally {
      setSaving(false)
    }
  }

  async function createAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !hypothesis.trim()) return
    await persist([...actions, { id: crypto.randomUUID(), title: title.trim(), hypothesis: hypothesis.trim(), pagePath, status: 'todo', createdAt: new Date().toISOString() }])
    setTitle('')
    setHypothesis('')
  }

  async function updateStatus(action: CroAction, status: CroAction['status']) {
    await persist(actions.map((item) => item.id === action.id ? { ...item, status } : item))
  }

  return (
    <section className="min-w-0 flex-1">
      <WorkNavigation active={section} />
      <PanelHeading title="CRO action board" description="Keep each optimization idea tied to an observable page and a testable hypothesis. This board tracks work; it does not run A/B tests or claim a change caused a result." />
      {saveError && <div role="alert" className="mb-4 rounded-xl border border-[#b4233e]/25 bg-[#fff4f5] px-4 py-3 text-sm text-[#8d2337]">{saveError}</div>}
      {error ? <ErrorPanel error={error} /> : isLoading ? <LoadingPanel label="Loading CRO actions" /> : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,.7fr)]">
          <ol className="divide-y divide-[#cfe2eb] rounded-2xl border border-[#cfe2eb] bg-white px-5">
            {actions.length ? actions.map((action) => (
              <li key={action.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-[#15384d]">{action.title}</h2><span className="rounded-full bg-[#e8f6fb] px-2.5 py-1 text-xs capitalize text-[#15384d]">{action.status.replace('_', ' ')}</span></div>
                  <p className="mt-2 text-sm leading-6 text-[#526b7b]">{action.hypothesis}</p>
                  <Link href={action.pagePath} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#006f9b] hover:underline">{action.pagePath}<ExternalLink size={12} /></Link>
                </div>
                {canEdit && <label className="text-xs font-medium text-[#526b7b]">Status<select disabled={saving} value={action.status} onChange={(event) => void updateStatus(action, event.target.value as CroAction['status'])} className="mt-1 block min-h-10 rounded-lg border border-[#b8d4e0] bg-white px-2 text-sm text-[#15384d]"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>}
              </li>
            )) : <li className="py-8 text-sm text-[#526b7b]">No actions yet. Add a hypothesis to start a measured improvement cycle.</li>}
          </ol>
          <aside className="h-fit rounded-2xl border border-[#cfe2eb] bg-[#e8f6fb] p-5">
            <h2 className="font-semibold text-[#15384d]">Add a CRO action</h2>
            <p className="mt-2 text-sm leading-5 text-[#526b7b]">State what you think is happening, which page to inspect, and the change you want to test.</p>
            {canEdit ? (
              <form onSubmit={createAction} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-[#15384d]">Action title<input maxLength={120} required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#b8d4e0] bg-white px-3 text-sm" /></label>
                <label className="block text-sm font-medium text-[#15384d]">Hypothesis<textarea maxLength={500} required rows={4} value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#b8d4e0] bg-white p-3 text-sm" /></label>
                <label className="block text-sm font-medium text-[#15384d]">Store page path<input maxLength={300} required pattern="^/(?!/)[^?#\s]*$" value={pagePath} onChange={(event) => setPagePath(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#b8d4e0] bg-white px-3 text-sm" /></label>
                <button type="submit" disabled={saving || !title.trim() || !hypothesis.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#006f9b] px-5 text-sm font-semibold text-white hover:bg-[#005d83] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={16} />{saving ? 'Saving…' : 'Add action'}</button>
              </form>
            ) : <p className="mt-5 text-sm text-[#526b7b]">Admin permissions are required to add or update actions.</p>}
          </aside>
        </div>
      )}
    </section>
  )
}

function Integrations({ section, canEdit }: { section: AdminSectionId; canEdit: boolean }) {
  const { data, error, isLoading, mutate } = useSWR<{ data: { config: IntegrationConfig; metaLeadAds: { configured: boolean; missing: string[] } } }>('/api/admin/marketing-integrations', fetcher)
  const [config, setConfig] = useState<IntegrationConfig>(initialConfig)
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (!data || initialized) return
    setConfig(data.data.config)
    setInitialized(true)
  }, [data, initialized])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setSaveError('')
    try {
      const response = await fetch('/api/admin/marketing-integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Integration settings could not be saved.')
      setConfig(result.data)
      setSaved(true)
      await mutate()
    } catch (errorValue) {
      setSaveError(reportError(errorValue, 'Integration settings could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof IntegrationConfig, value: string) => {
    setSaved(false)
    setConfig((current) => ({ ...current, [key]: value }))
  }
  const inputClass = 'mt-1 block min-h-11 w-full rounded-lg border border-[#b8d4e0] bg-white px-3 text-sm text-[#15384d] placeholder:text-[#778c99] disabled:bg-[#f7fcff] disabled:text-[#526b7b]'

  return (
    <section className="min-w-0 flex-1">
      <WorkNavigation active={section} />
      <PanelHeading title="Marketing integrations" description="Connect browser-side analytics and ad tags. Public provider IDs are stored in the database; no access token is collected here. Tags and first-party funnel events remain off until a visitor allows optional analytics." />
      {error ? <ErrorPanel error={error} /> : isLoading || !data ? <LoadingPanel label="Loading integration setup" /> : (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#cfe2eb] bg-[#e8f6fb] p-4 text-sm leading-6 text-[#15384d]">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#006f9b]" aria-hidden="true" />
            <p>These are public tracking identifiers, not credentials. The app never sends provider access tokens to the browser. Enable a provider only after confirming your privacy notice and consent requirements.</p>
          </div>
          {saveError && <div role="alert" className="mb-4 rounded-xl border border-[#b4233e]/25 bg-[#fff4f5] px-4 py-3 text-sm text-[#8d2337]">{saveError}</div>}
          {saved && <div role="status" className="mb-4 rounded-xl border border-[#087ba5]/20 bg-[#e8f6fb] px-4 py-3 text-sm text-[#15384d]">Tracking configuration saved. Allow up to one minute for public storefront configuration to refresh.</div>}
          <form onSubmit={save} className="space-y-6">
            <fieldset disabled={!canEdit || saving} className="space-y-6">
              <section className="rounded-2xl border border-[#cfe2eb] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#15384d]">Meta Pixel</h2><p className="mt-1 text-sm leading-5 text-[#526b7b]">Browser events: page view, product view, add to bag, checkout start, and purchase.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.metaPixelId ? 'bg-[#e8f6fb] text-[#006f9b]' : 'bg-[#f7fcff] text-[#526b7b]'}`}>{config.metaPixelId ? 'ID saved' : 'Not connected'}</span></div>
                <label className="mt-4 block max-w-xl text-sm font-medium text-[#15384d]">Meta Pixel ID<input autoComplete="off" inputMode="numeric" pattern="[0-9]{5,30}" placeholder="123456789012345" value={config.metaPixelId} onChange={(event) => update('metaPixelId', event.target.value)} className={inputClass} /></label>
                <details className="mt-4 text-sm text-[#526b7b]"><summary className="cursor-pointer font-medium text-[#006f9b]">Where to find this ID</summary><ol className="mt-3 list-decimal space-y-1 pl-5 leading-6"><li>Open Meta Business Suite and choose the correct Business portfolio.</li><li>Go to Events Manager, select or create a data source, then choose Web.</li><li>Open the Pixel settings and copy the numeric Pixel ID. No access token is needed for browser Pixel events.</li><li>Test with Meta Pixel Helper after accepting analytics consent on the live storefront.</li></ol></details>
              </section>
              <section className="rounded-2xl border border-[#cfe2eb] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#15384d]">Google Analytics 4</h2><p className="mt-1 text-sm leading-5 text-[#526b7b]">Direct Google tag for GA4 events. Do not also configure GA4 inside GTM while a direct Measurement ID is saved.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.ga4MeasurementId ? 'bg-[#e8f6fb] text-[#006f9b]' : 'bg-[#f7fcff] text-[#526b7b]'}`}>{config.ga4MeasurementId ? 'ID saved' : 'Not connected'}</span></div>
                <label className="mt-4 block max-w-xl text-sm font-medium text-[#15384d]">GA4 Measurement ID<input autoComplete="off" placeholder="G-XXXXXXXXXX" value={config.ga4MeasurementId} onChange={(event) => update('ga4MeasurementId', event.target.value.trim().toUpperCase())} className={inputClass} /></label>
                <details className="mt-4 text-sm text-[#526b7b]"><summary className="cursor-pointer font-medium text-[#006f9b]">Where to find this ID</summary><ol className="mt-3 list-decimal space-y-1 pl-5 leading-6"><li>Open Google Analytics Admin and select the correct property.</li><li>Under Data collection and modification, open Data streams and choose the web stream for isklenses.com.</li><li>Copy the Measurement ID beginning with <code>G-</code>. No API secret is needed for this browser integration.</li><li>Use Realtime reports or DebugView to verify events after accepting analytics consent.</li></ol></details>
              </section>
              <section className="rounded-2xl border border-[#cfe2eb] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#15384d]">Google Tag Manager</h2><p className="mt-1 text-sm leading-5 text-[#526b7b]">Loads your GTM container after consent. Configure GA4 and ad tags inside GTM, then leave direct GA4 and Ads fields blank.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.gtmContainerId ? 'bg-[#e8f6fb] text-[#006f9b]' : 'bg-[#f7fcff] text-[#526b7b]'}`}>{config.gtmContainerId ? 'ID saved' : 'Not connected'}</span></div>
                <label className="mt-4 block max-w-xl text-sm font-medium text-[#15384d]">GTM Container ID<input autoComplete="off" placeholder="GTM-XXXXXXX" value={config.gtmContainerId} onChange={(event) => update('gtmContainerId', event.target.value.trim().toUpperCase())} className={inputClass} /></label>
                <details className="mt-4 text-sm text-[#526b7b]"><summary className="cursor-pointer font-medium text-[#006f9b]">Where to find this ID</summary><ol className="mt-3 list-decimal space-y-1 pl-5 leading-6"><li>Open tagmanager.google.com and select the correct account and web container.</li><li>Find the container ID in the top navigation or Admin → Install Google Tag Manager.</li><li>Copy the ID beginning with <code>GTM-</code>. No container password or API token belongs here.</li><li>Create tags that listen for the custom <code>isk_page_view</code>, <code>isk_add_to_cart</code>, <code>isk_begin_checkout</code>, and <code>isk_purchase</code> events sent to dataLayer.</li></ol></details>
              </section>
              <section className="rounded-2xl border border-[#cfe2eb] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#15384d]">Google Ads conversion</h2><p className="mt-1 text-sm leading-5 text-[#526b7b]">Direct purchase conversion tag. If you use GTM, configure this conversion there instead.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.googleAdsConversionId ? 'bg-[#e8f6fb] text-[#006f9b]' : 'bg-[#f7fcff] text-[#526b7b]'}`}>{config.googleAdsConversionId ? 'IDs saved' : 'Not connected'}</span></div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[#15384d]">Conversion ID<input autoComplete="off" placeholder="AW-123456789" value={config.googleAdsConversionId} onChange={(event) => update('googleAdsConversionId', event.target.value.trim().toUpperCase())} className={inputClass} /></label>
                  <label className="block text-sm font-medium text-[#15384d]">Conversion label<input autoComplete="off" placeholder="AbCdEfGhIjKlMnOp" value={config.googleAdsConversionLabel} onChange={(event) => update('googleAdsConversionLabel', event.target.value.trim())} className={inputClass} /></label>
                </div>
                <details className="mt-4 text-sm text-[#526b7b]"><summary className="cursor-pointer font-medium text-[#006f9b]">Where to find both values</summary><ol className="mt-3 list-decimal space-y-1 pl-5 leading-6"><li>In Google Ads, open Goals → Conversions → Summary and choose the purchase conversion action.</li><li>Open Tag setup → Use Google tag, then copy the Conversion ID and the event snippet's Conversion label.</li><li>Save both values together. The purchase event fires only after an order succeeds and analytics consent is granted.</li></ol></details>
              </section>
              <section className="rounded-2xl border border-[#cfe2eb] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-[#15384d]">TikTok Pixel</h2><p className="mt-1 text-sm leading-5 text-[#526b7b]">Browser events for product views, bag additions, checkout, and purchase.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${config.tiktokPixelId ? 'bg-[#e8f6fb] text-[#006f9b]' : 'bg-[#f7fcff] text-[#526b7b]'}`}>{config.tiktokPixelId ? 'ID saved' : 'Not connected'}</span></div>
                <label className="mt-4 block max-w-xl text-sm font-medium text-[#15384d]">TikTok Pixel ID<input autoComplete="off" placeholder="CXXXXXXXXXXXXXXXXX" value={config.tiktokPixelId} onChange={(event) => update('tiktokPixelId', event.target.value.trim())} className={inputClass} /></label>
                <details className="mt-4 text-sm text-[#526b7b]"><summary className="cursor-pointer font-medium text-[#006f9b]">Where to find this ID</summary><ol className="mt-3 list-decimal space-y-1 pl-5 leading-6"><li>Open TikTok Ads Manager and choose Tools → Events.</li><li>Create or select a Web data source and choose TikTok Pixel.</li><li>Copy the Pixel ID from the source settings; do not paste a Business Center password or token.</li></ol></details>
              </section>
            </fieldset>
            {config.gtmContainerId && (config.ga4MeasurementId || config.googleAdsConversionId) && <p role="alert" className="text-sm text-[#8d2337]">Remove direct Google IDs or GTM to avoid duplicate Google events.</p>}
            {!canEdit && <p className="text-sm text-[#526b7b]">Admin permissions are required to change integration settings.</p>}
            {canEdit && <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#006f9b] px-5 text-sm font-semibold text-white hover:bg-[#005d83] disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{saving ? 'Saving…' : 'Save integration settings'}</button>}
          </form>
          <section className="mt-8 border-t border-[#cfe2eb] pt-6">
            <h2 className="font-semibold text-[#15384d]">Meta Lead Ads webhook</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#526b7b]">This existing server integration imports opted-in lead form submissions into CRM. It is separate from Meta Pixel and requires server-only credentials. Values are never returned by this status check.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.data.metaLeadAds.configured ? 'bg-[#e8f6fb] text-[#006f9b]' : 'bg-[#fff4e8] text-[#805019]'}`}>{data.data.metaLeadAds.configured ? 'Webhook configured' : 'Setup incomplete'}</span>
              {!data.data.metaLeadAds.configured && <span className="text-sm text-[#526b7b]">Missing server keys: {data.data.metaLeadAds.missing.map((key) => <code key={key} className="ml-1 rounded bg-white px-1.5 py-0.5">{key}</code>)}</span>}
            </div>
            <details className="mt-4 text-sm text-[#526b7b]"><summary className="cursor-pointer font-medium text-[#006f9b]">See the full token and webhook setup guide</summary><div className="mt-3 space-y-2 leading-6"><p>Use the environment-variable names above in the Vercel Production project settings. Never put these values in this form, source control, or a <code>NEXT_PUBLIC_</code> variable.</p><p>The app secret comes from Meta for Developers → App settings → Basic. The page access token is created for the selected Facebook Page with the required Lead Ads permissions. The Page ID is the numeric ID of that Page. The webhook verify token is a new random phrase you choose and enter both here and in Meta's webhook setup. Set the Graph API version to the current version supported by the app's Meta integration.</p><Link href="/api/webhooks/meta-leads" className="inline-flex items-center gap-1 font-medium text-[#006f9b] hover:underline">Webhook endpoint details <ExternalLink size={13} /></Link></div></details>
          </section>
          <p className="mt-7 flex items-start gap-2 text-xs leading-5 text-[#526b7b]"><CircleHelp size={15} className="mt-0.5 shrink-0" />Pixels and analytics can undercount visitors who decline, block scripts, or use native apps. The internal order database remains authoritative for order totals.</p>
        </>
      )}
    </section>
  )
}

export function GrowthWorkspace({ section, canEdit }: { section: AdminSectionId; canEdit: boolean }) {
  if (section === 'cro-funnel') return <Funnel section={section} />
  if (section === 'cro-actions') return <Actions section={section} canEdit={canEdit} />
  if (section === 'marketing-integrations') return <Integrations section={section} canEdit={canEdit} />
  return <Overview section={section} />
}
