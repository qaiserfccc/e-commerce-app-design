'use client'

import { useDeferredValue, useEffect, useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { ExternalLink, Plus, Search, UserRoundPlus } from 'lucide-react'
import { createCrmLead, updateCrmLead } from '@/app/actions/admin'
import { Alert, Field, inputClass, primaryButton, secondaryButton, errorText } from '@/components/admin/admin-ui'
import { Pagination } from '@/components/ui/pagination'

const pageSize = 50
const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const
type LeadStatus = (typeof statuses)[number]

type CrmLead = {
  id: string
  source: 'meta' | 'manual'
  status: LeadStatus
  fullName: string | null
  email: string | null
  phone: string | null
  notes: string | null
  followUpAt: string | null
  metaLeadId: string | null
  metaPageId: string | null
  metaFormId: string | null
  metaAdId: string | null
  metaCampaignId: string | null
  createdAt: string
  updatedAt: string
  customer: { id: string; email: string; fullName: string | null; orderCount: number } | null
}

type CrmResponse = {
  data: CrmLead[]
  total: number
  metaSetup: { configured: boolean; missing: string[] }
}

async function fetcher(url: string): Promise<CrmResponse> {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json()
  if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'))
  if (!response.ok) throw new Error(body.error || 'Unable to load CRM leads.')
  return body
}

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function CrmWorkspace({ canEdit }: { canEdit: boolean }) {
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editingLeadId, setEditingLeadId] = useState('')
  const [notes, setNotes] = useState('')
  const [followUpAt, setFollowUpAt] = useState('')
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const params = new URLSearchParams({ offset: String(offset) })
  if (deferredQuery) params.set('q', deferredQuery)
  if (status) params.set('status', status)
  const { data, error, isLoading, mutate } = useSWR<CrmResponse>(`/api/admin/crm?${params}`, fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
  })

  useEffect(() => { setOffset(0) }, [deferredQuery, status])
  useEffect(() => { setWebhookUrl(`${window.location.origin}/api/webhooks/meta-leads`) }, [])

  async function saveLead(lead: CrmLead, changes: Parameters<typeof updateCrmLead>[1]) {
    setBusy(lead.id)
    setMessage('')
    try {
      await updateCrmLead(lead.id, changes)
      setEditingLeadId('')
      await mutate()
    } catch (saveError) {
      setMessage(errorText(saveError))
    } finally {
      setBusy('')
    }
  }

  async function submitNewLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy('new')
    setMessage('')
    try {
      await createCrmLead({
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        notes: String(form.get('notes') ?? ''),
        followUpAt: form.get('followUpAt') ? new Date(String(form.get('followUpAt'))).toISOString() : '',
      })
      formElement.reset()
      setNewLeadOpen(false)
      setOffset(0)
      await mutate()
    } catch (createError) {
      setMessage(errorText(createError))
    } finally {
      setBusy('')
    }
  }

  function startEditing(lead: CrmLead) {
    setEditingLeadId(lead.id)
    setNotes(lead.notes ?? '')
    setFollowUpAt(localDateTime(lead.followUpAt))
  }

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-.04em]">CRM leads</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68675f]">Manage customer enquiries in one pipeline. Meta Lead Ads sync through a signed server-side webhook; manual leads remain available independently.</p>
        </div>
        {canEdit && <button type="button" className={primaryButton} onClick={() => setNewLeadOpen((open) => !open)}>
          <UserRoundPlus size={16} aria-hidden="true" /> {newLeadOpen ? 'Close form' : 'Add lead'}
        </button>}
      </div>

      {data?.metaSetup && !data.metaSetup.configured && (
        <Alert tone="info">Meta Lead Ads are not configured. Add the values and webhook subscription below to enable lead capture.</Alert>
      )}
      <details className="my-4 rounded-2xl border border-[#cfe2eb] bg-white">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-[#15384d] marker:text-[#006f9b]">
          Meta Lead Ads setup {data?.metaSetup?.configured ? '· connected' : '· setup required'}
        </summary>
        <div className="border-t border-[#cfe2eb] px-4 py-4 text-sm leading-6 text-[#526b7b]">
          <p>Connect an Instant Form on your Facebook or Instagram ads to this CRM. Credentials stay server-side; never paste Meta secrets into this page or send them in a message.</p>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            <li>
              <span className="font-semibold text-[#15384d]">Prepare your Meta assets.</span> In <a className="font-medium text-[#006f9b] underline" href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers <ExternalLink className="inline" size={13} aria-hidden="true" /></a>, create or select your business app, connect the Facebook Page that owns the lead forms, and grant the app the current Lead Ads retrieval and Page webhook permissions Meta requires for those assets. Ensure the app/business has the required access for the Page and lead forms.
            </li>
            <li>
              <span className="font-semibold text-[#15384d]">Add server variables in Vercel.</span> Open the <code>e-commerce-app-design</code> project’s <strong>Settings → Environment Variables</strong>. Add each variable below to <strong>Production</strong> (and Preview if you test there). Choose the current Graph API version supported by your Meta app. The Vercel dashboard and values remain outside this CRM page.
              <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs">
                <li>META_APP_SECRET — App settings → Basic → App Secret</li>
                <li>META_WEBHOOK_VERIFY_TOKEN — generate your own long random string</li>
                <li>META_PAGE_ACCESS_TOKEN — server-side access token for this Page with lead retrieval access</li>
                <li>META_PAGE_ID — numeric ID for the same Page</li>
                <li>META_GRAPH_API_VERSION — supported version, format vNN.N</li>
              </ul>
              {data?.metaSetup?.missing.length ? <p className="mt-2">Currently missing or placeholder: <code>{data.metaSetup.missing.join(', ')}</code>.</p> : null}
            </li>
            <li>
              <span className="font-semibold text-[#15384d]">Subscribe the Page webhook.</span> In Meta’s app dashboard, add a <strong>Page</strong> webhook subscription for <code>leadgen</code>, set the callback URL to the deployed URL below, and enter the exact same value as <code>META_WEBHOOK_VERIFY_TOKEN</code> when Meta requests a verify token.
              <code className="mt-2 block break-all rounded-lg bg-[#f7fcff] p-3 text-[#15384d]">{webhookUrl || 'https://<your-production-domain>/api/webhooks/meta-leads'}</code>
            </li>
            <li>
              <span className="font-semibold text-[#15384d]">Redeploy and test.</span> Save the variables, redeploy so they are available to the running deployment, complete webhook verification, then submit a Meta test lead. Check that it appears here and replay it to confirm duplicate delivery does not create another record.
            </li>
          </ol>
          <p className="mt-4">Placeholder values are intentionally treated as unconfigured. Messenger, Instagram DMs, and WhatsApp are separate integrations and are not enabled by this Lead Ads connection.</p>
        </div>
      </details>
      {message && <div className="mt-4"><Alert>{message}</Alert></div>}
      {newLeadOpen && canEdit && (
        <form onSubmit={submitNewLead} className="my-5 grid gap-4 rounded-2xl border border-[#cfe2eb] bg-white p-4 sm:grid-cols-2 sm:p-5">
          <Field label="Name" required><input name="fullName" required maxLength={180} className={inputClass} /></Field>
          <Field label="Email"><input name="email" type="email" maxLength={254} className={inputClass} /></Field>
          <Field label="Phone"><input name="phone" type="tel" maxLength={80} className={inputClass} /></Field>
          <Field label="Follow-up"><input name="followUpAt" type="datetime-local" className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea name="notes" maxLength={5000} rows={3} className={inputClass} /></Field></div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" className={primaryButton} disabled={busy === 'new'}><Plus size={16} aria-hidden="true" />{busy === 'new' ? 'Adding…' : 'Create lead'}</button>
            <p className="text-xs text-[#68675f]">If the email matches a store customer, the record will be linked automatically.</p>
          </div>
        </form>
      )}

      <div className="my-4 flex flex-wrap gap-3">
        <label className="flex min-w-[min(100%,16rem)] flex-1 items-center gap-2 rounded-xl border border-[#b8d4e0] bg-white px-3">
          <Search size={16} className="shrink-0 text-[#526b7b]" aria-hidden="true" />
          <span className="sr-only">Search leads</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone or Meta IDs" className="w-full bg-transparent py-2.5 text-sm text-[#15384d] outline-none placeholder:text-[#526b7b]" />
        </label>
        <label className="sr-only" htmlFor="crm-status-filter">Filter by pipeline status</label>
        <select id="crm-status-filter" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-xl border border-[#b8d4e0] bg-white px-3 text-sm text-[#15384d]">
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
        </select>
      </div>

      {(error || (message && !data)) && <Alert>{error ? errorMessage(error) : message}</Alert>}
      {isLoading ? <div className="space-y-3" role="status" aria-label="Loading CRM leads">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/70" />)}</div>
        : data?.data.length ? (
          <div className="space-y-3">
            {data.data.map((lead) => (
              <article key={lead.id} className="rounded-2xl border border-[#cfe2eb] bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#15384d]">{lead.fullName || 'Name not provided'}</h2>
                      <span className="rounded-full bg-[#e8f6fb] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#006f9b]">{lead.source === 'meta' ? 'Meta Lead Ad' : 'Manual'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#526b7b]">
                      {lead.email && <a className="underline decoration-[#b8d4e0] underline-offset-2" href={`mailto:${lead.email}`}>{lead.email}</a>}
                      {lead.phone && <a className="underline decoration-[#b8d4e0] underline-offset-2" href={`tel:${lead.phone}`}>{lead.phone}</a>}
                      {!lead.email && !lead.phone && <span>No contact details supplied</span>}
                    </div>
                    <p className="mt-2 text-xs text-[#68675f]">Created {new Date(lead.createdAt).toLocaleString()} · Updated {new Date(lead.updatedAt).toLocaleString()}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-[#526b7b]">
                    <span>Status</span>
                    <select value={lead.status} disabled={!canEdit || busy === lead.id} onChange={(event) => void saveLead(lead, { status: event.target.value })} className="min-h-10 rounded-xl border border-[#b8d4e0] bg-white px-3 text-sm text-[#15384d]">
                      {statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
                    </select>
                  </label>
                </div>

                {lead.customer && <div className="mt-3 rounded-xl bg-[#f7fcff] px-3 py-2 text-xs text-[#526b7b]">
                  Matched customer: <a className="font-medium text-[#006f9b] underline" href="/admin/customers">{lead.customer.fullName || lead.customer.email}</a> · {lead.customer.orderCount} existing {lead.customer.orderCount === 1 ? 'order' : 'orders'} {lead.customer.orderCount > 0 && <a className="ml-1 font-medium text-[#006f9b] underline" href="/admin/orders">View orders</a>}
                </div>}
                {lead.followUpAt && <p className="mt-3 text-sm text-[#526b7b]">Follow up: <time dateTime={lead.followUpAt}>{new Date(lead.followUpAt).toLocaleString()}</time></p>}
                {lead.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#353531]">{lead.notes}</p>}

                {lead.source === 'meta' && <details className="mt-3 text-xs text-[#68675f]">
                  <summary className="cursor-pointer font-medium">Meta attribution</summary>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <MetaValue label="Page ID" value={lead.metaPageId} />
                    <MetaValue label="Form ID" value={lead.metaFormId} />
                    <MetaValue label="Ad ID" value={lead.metaAdId} />
                    <MetaValue label="Campaign ID" value={lead.metaCampaignId} />
                    <MetaValue label="Lead ID" value={lead.metaLeadId} />
                  </dl>
                </details>}

                <div className="mt-4 border-t border-[#cfe2eb] pt-3">
                  {editingLeadId === lead.id ? (
                    <div className="grid gap-3 sm:grid-cols-[1fr_15rem]">
                      <Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={3} disabled={!canEdit} className={inputClass} /></Field>
                      <Field label="Follow-up"><input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} disabled={!canEdit} className={inputClass} /></Field>
                      <div className="flex gap-2 sm:col-span-2">
                        <button type="button" disabled={!canEdit || busy === lead.id} onClick={() => void saveLead(lead, { notes, followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null })} className={primaryButton}>{busy === lead.id ? 'Saving…' : 'Save follow-up & notes'}</button>
                        <button type="button" onClick={() => setEditingLeadId('')} className={secondaryButton}>Cancel</button>
                      </div>
                    </div>
                  ) : <button type="button" disabled={!canEdit} onClick={() => startEditing(lead)} className={`${secondaryButton} text-xs`}>{lead.notes || lead.followUpAt ? 'Edit notes / follow-up' : 'Add notes / follow-up'}</button>}
                </div>
              </article>
            ))}
            <Pagination total={data.total} page={Math.floor(offset / pageSize) + 1} pageSize={pageSize} onPageChange={(page) => setOffset((page - 1) * pageSize)} itemLabel="leads" />
          </div>
        ) : !error && <div className="rounded-2xl border border-dashed border-[#1c1c1a]/20 bg-white/60 px-5 py-10 text-center text-sm text-[#68675f]">{deferredQuery || status ? 'No leads match these filters.' : 'No leads yet. Add one manually or connect Meta Lead Ads.'}</div>}
    </section>
  )
}

function MetaValue({ label, value }: { label: string; value: string | null }) {
  return <div className="flex gap-2"><dt className="font-medium">{label}:</dt><dd className="break-all">{value || '—'}</dd></div>
}

function errorMessage(error: unknown) {
  return errorText(error)
}
