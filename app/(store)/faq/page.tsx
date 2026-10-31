import type { Metadata } from 'next'
import { ContentPage } from '@/components/storefront/content-page'
import { storefrontFaqs } from '@/lib/data/storefront-faq'

export const metadata: Metadata = { title: 'Frequently asked questions' }

export default function Page() {
  return (
    <ContentPage title="FAQ" intro="Answers to common questions about ordering from ISK Lenses.">
      <div className="divide-y divide-[#033473]/15 border-y border-[#033473]/15">
        {storefrontFaqs.map(({ question, answer }) => (
          <details key={question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#033473]">
              {question}
              <span aria-hidden="true" className="text-xl transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-[#4a5568]">{answer}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  )
}
