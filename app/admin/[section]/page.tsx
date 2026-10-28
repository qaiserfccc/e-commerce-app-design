import { notFound } from 'next/navigation'
import { AdminShell } from '@/components/admin/admin-shell'
import { ADMIN_SECTION_IDS, type AdminSectionId } from '@/lib/admin-sections'

export const metadata = { title: 'Admin workspace', robots: { index: false, follow: false } }

function isAdminSection(value: string): value is AdminSectionId {
  return ADMIN_SECTION_IDS.some((section) => section === value)
}

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!isAdminSection(section)) notFound()
  return <AdminShell section={section} />
}
