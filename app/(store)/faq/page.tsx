import type { Metadata } from 'next'
import { ContentPage } from '@/components/storefront/content-page'

export const metadata: Metadata = { title: 'Frequently asked questions' }

const faqs: Array<[string, string]> = [
  ['How do I pay for my order?', 'All orders are cash on delivery. You pay the courier when your parcel arrives. No online payment is collected on this site.'],
  ['How much is delivery?', 'We deliver across Pakistan. The delivery charge is not added at checkout; we confirm it with you before your order is dispatched.'],
  ['Do I need an account to order?', 'No. You can check out as a guest, or create an account to reuse your email at checkout. Email addresses are not verified and password reset is not available yet.'],
  ['How do I choose the right lens?', 'Open a product and pick from the options listed for it. Details such as power, diameter or pack size are shown only when they are recorded for that listing. If you are unsure, check with your eye-care professional before ordering.'],
  ['Why is a product marked sold out?', 'Stock is tracked per product option. Sold-out items cannot be added to the cart until they are restocked.'],
  ['Can I change or cancel my order?', 'Contact us with your order reference as soon as possible and we will help while the order has not yet been dispatched.'],
  ['How do I contact the store?', 'Use the details on the Contact us page.'],
]

export default function Page() {
  return (
    <ContentPage title="FAQ" intro="Answers to common questions about ordering from ISK Lenses.">
      <div className="divide-y divide-[#033473]/15 border-y border-[#033473]/15">
        {faqs.map(([question, answer]) => (
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
