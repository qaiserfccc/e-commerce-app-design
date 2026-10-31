'use client'

import { useEffect, useState } from 'react'
import { Alert, Field, inputClass, primaryButton } from '@/components/admin/admin-ui'
import { LoaderCircle } from 'lucide-react'

type Settings = { enabled: boolean; welcomeMessage: string }

export function ChatbotManager({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/chatbot/settings', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Chatbot settings could not be loaded.')
        if (active) setSettings(body.data as Settings)
      })
      .catch((error: unknown) => {
        if (active) setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Chatbot settings could not be loaded.' })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function save() {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/chatbot/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Chatbot settings could not be saved.')
      setSettings(body.data as Settings)
      setMessage({ tone: 'info', text: 'Assistant settings saved.' })
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Chatbot settings could not be saved.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Store chatbot</h1>
      <p className="mb-6 mt-1 max-w-2xl text-sm leading-6 text-[#68675f]">
        Configure the assistant shown on storefront pages. It answers from published product listings and the public FAQ; it does not use AI, access order/customer records, or provide lens-fitting or eye-health advice.
      </p>
      {message && <div className="mb-4"><Alert tone={message.tone}>{message.text}</Alert></div>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#68675f]" role="status"><LoaderCircle size={17} className="animate-spin" /> Loading chatbot settings…</div>
      ) : settings ? (
        <div className="max-w-2xl rounded-2xl border border-[#cfe2eb] bg-white p-5 sm:p-6">
          <label className="flex items-start gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.enabled}
              disabled={!canEdit}
              onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
              className="mt-1 size-4 accent-[#006f9b]"
            />
            <span>
              Show assistant on the storefront
              <span className="mt-1 block text-xs font-normal leading-5 text-[#526b7b]">When turned off, the floating chat control is hidden and the answer endpoint declines questions.</span>
            </span>
          </label>
          <div className="mt-6">
            <Field label="Welcome message">
              <textarea
                rows={3}
                maxLength={180}
                value={settings.welcomeMessage}
                disabled={!canEdit}
                onChange={(event) => setSettings({ ...settings, welcomeMessage: event.target.value })}
                className={inputClass}
              />
            </Field>
            <p className="mt-1 text-xs text-[#526b7b]">Up to 180 characters. The answer system is limited to public store FAQs and active catalog information.</p>
          </div>
          {canEdit && <button type="button" disabled={saving || !settings.welcomeMessage.trim()} onClick={() => void save()} className={`${primaryButton} mt-5`}>{saving ? 'Saving…' : 'Save chatbot settings'}</button>}
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-[#526b7b]">Shopper control: fixed at the lower-right corner on storefront pages. Configuration: Admin → Chatbot (`/admin/chatbot`).</p>
    </section>
  )
}
