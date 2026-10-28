'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Save } from 'lucide-react'
import { getDeliverySettings, saveDeliverySettings } from '@/app/actions/admin'
import type { DeliverySettings } from '@/lib/delivery'
import { reportError } from '@/lib/ui/notifications'

const emptySettings: DeliverySettings = {
  deliveryFee: '',
  freeShippingThreshold: '',
  isConfigured: false,
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-[#d8d6cf] bg-white px-3 py-3 text-sm text-[#1c1c1a] outline-none focus-visible:border-[#087ba5] focus-visible:ring-2 focus-visible:ring-[#087ba5]/20 disabled:bg-[#f2f1ed]'

export function DeliveryManager({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getDeliverySettings()
      .then((result) => {
        if (active) setSettings(result)
      })
      .catch((loadError: unknown) => {
        if (active) setError(reportError(loadError, 'Delivery pricing could not be loaded.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await saveDeliverySettings({
        deliveryFee: settings.deliveryFee,
        freeShippingThreshold: settings.freeShippingThreshold,
      })
      setSettings(result)
      setMessage('Delivery pricing saved.')
    } catch (saveError) {
      setError(reportError(saveError, 'Delivery pricing could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-.04em]">Manage delivery</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68675f]">Set the cash-on-delivery fee and the order subtotal at which delivery becomes free.</p>
      </header>
      <form onSubmit={save} className="max-w-2xl rounded-2xl border border-[#1c1c1a]/10 bg-white p-5 sm:p-7">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-[#68675f]" role="status"><LoaderCircle size={16} className="animate-spin" />Loading delivery prices…</div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Delivery price <span className="text-red-600" aria-hidden="true">*</span>
                <span className="mt-1 block text-xs font-normal text-[#68675f]">Charged below the free-delivery minimum.</span>
                <span className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#68675f]">PKR</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="9999999999.99"
                    step="0.01"
                    required
                    value={settings.deliveryFee}
                    onChange={(event) => setSettings((current) => ({ ...current, deliveryFee: event.target.value }))}
                    disabled={!canEdit || saving}
                    className={`${inputClass} pl-12`}
                  />
                </span>
              </label>
              <label className="block text-sm font-medium">
                Free delivery from
                <span className="mt-1 block text-xs font-normal text-[#68675f]">Leave blank to charge delivery on every order.</span>
                <span className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#68675f]">PKR</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={settings.freeShippingThreshold}
                    onChange={(event) => setSettings((current) => ({ ...current, freeShippingThreshold: event.target.value }))}
                    disabled={!canEdit || saving}
                    className={`${inputClass} pl-12`}
                  />
                </span>
              </label>
            </div>
            <p className="mt-5 border border-[#cfe2eb] bg-[#e8f6fb] px-4 py-3 text-sm leading-6 text-[#15384d]">
              {settings.isConfigured
                ? 'Checkout adds the delivery price automatically. Orders at or above the free-delivery minimum have a Rs 0 delivery charge.'
                : 'Save delivery pricing to enable checkout. The configured charge and any free-delivery minimum will be shown before an order is placed.'}
            </p>
            {!canEdit && <p className="mt-4 text-sm text-[#68675f]">You have read-only access to delivery pricing.</p>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-[#b4233e]/25 bg-[#fff4f2] px-4 py-3 text-sm text-[#782b36]">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-xl border border-[#087ba5]/20 bg-[#e8f6fb] px-4 py-3 text-sm text-[#15384d]">{message}</p>}
            <button type="submit" disabled={!canEdit || saving} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#006f9b] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#15384d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087ba5] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save delivery pricing'}
            </button>
          </>
        )}
      </form>
    </section>
  )
}
