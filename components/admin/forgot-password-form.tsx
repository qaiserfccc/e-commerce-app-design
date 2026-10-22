'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { LoaderCircle } from 'lucide-react'

const inputClass = 'mt-2 w-full rounded-xl border border-[#1c1c1a]/15 bg-white px-3 py-2.5 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1a]'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/password-reset', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => setConfigured(Boolean(result.configured)))
      .catch(() => setConfigured(false))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recoveryKey, newPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to reset the password.')
      setDone(true)
      setRecoveryKey('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reset the password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="w-full max-w-lg rounded-2xl border border-[#1c1c1a]/10 bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-[-.04em]">Reset admin password</h1>
      <p className="mt-2 text-sm leading-6 text-[#68675f]">
        Enter your account email, the site recovery key, and a new password. No email is sent.
      </p>

      {done ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="rounded-xl border border-[#52624f]/20 bg-[#e2e7df] px-4 py-3 text-sm text-[#465342]">
            Password updated. Existing sessions for this account were signed out.
          </p>
          <Link href="/admin" className="inline-block rounded-full bg-[#1c1c1a] px-4 py-2.5 text-sm font-medium text-white">Back to sign in</Link>
        </div>
      ) : configured === false ? (
        <p role="alert" className="mt-6 rounded-xl border border-[#9b4a36]/25 bg-[#f8eeeb] px-4 py-3 text-sm text-[#753b2d]">
          Recovery is not enabled. Set <code>ADMIN_RECOVERY_KEY</code> (at least 8 characters) on the server to turn it on.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && <p role="alert" className="rounded-xl border border-[#9b4a36]/25 bg-[#f8eeeb] px-4 py-3 text-sm text-[#753b2d]">{error}</p>}
          <label className="block text-sm font-medium">
            Email
            <input required type="email" maxLength={254} autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Recovery key
            <input required type="password" maxLength={256} autoComplete="off" value={recoveryKey} onChange={(event) => setRecoveryKey(event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            New password
            <input required type="password" minLength={6} maxLength={256} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} />
            <span className="mt-1 block text-xs font-normal text-[#68675f]">At least 6 characters.</span>
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input required type="password" minLength={6} maxLength={256} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </label>
          <button
            type="submit"
            disabled={submitting || configured === null}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1c1c1a] px-4 py-3 text-sm font-medium text-white hover:bg-[#353531] disabled:cursor-wait disabled:opacity-60"
          >
            {submitting && <LoaderCircle size={16} className="animate-spin" />}
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
          <Link href="/admin" className="block text-center text-sm text-[#68675f] underline">Back to sign in</Link>
        </form>
      )}
    </section>
  )
}
