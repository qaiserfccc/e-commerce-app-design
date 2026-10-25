import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/admin/forgot-password-form'

export const metadata: Metadata = { title: 'Reset admin password', robots: { index: false, follow: false } }

export default function ForgotPasswordPage() {
  return (
    <main className="admin-theme grid min-h-screen place-items-center bg-[#fffaf8] px-4 py-10">
      <ForgotPasswordForm />
    </main>
  )
}
