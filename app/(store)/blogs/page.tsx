import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/components/storefront/content-page'

export const metadata: Metadata = { title: 'Blogs' }

export default function Page() {
  return (
    <ContentPage title="Blogs" intro="Buying guides and lens-care articles.">
      <p className="rounded-2xl bg-[#eef3fa] p-6">No articles have been published yet. In the meantime, browse the <Link href="/shop">full catalogue</Link> or read the <Link href="/faq">FAQ</Link>.</p>
    </ContentPage>
  )
}
