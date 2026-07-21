'use client'

import dynamic from 'next/dynamic'

const GenerateFormClient = dynamic(() => import('./GenerateFormClient'), {
  ssr: false,
  loading: () => (
    <main className="auth-loader" aria-live="polite">
      <span className="auth-loader__spinner" aria-hidden="true" />
      <p>Loading plan preview...</p>
    </main>
  ),
})

export default function GenerateFormPage() {
  return <GenerateFormClient />
}
