'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#15384d' }}>
          <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
            <h1>ISK Lenses is temporarily unavailable</h1>
            <p style={{ lineHeight: 1.6 }}>The page could not be displayed. Please try again.</p>
            <button type="button" onClick={reset} style={{ marginTop: '1rem', border: 0, borderRadius: '999px', background: '#006f9b', color: 'white', padding: '0.8rem 1.3rem', fontWeight: 600 }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  )
}
