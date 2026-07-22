'use client'

import dynamic from 'next/dynamic'
import type { OnboardingPlan } from '@/types/plan'

const GenerateFormClient = dynamic(() => import('./GenerateFormClient'), {
  ssr: false,
  loading: () => (
    <main className="auth-loader" aria-live="polite">
      <span className="auth-loader__spinner" aria-hidden="true" />
      <p>Loading plan preview...</p>
    </main>
  ),
})

export default function PlanPreview({ plan, planId }: { plan: OnboardingPlan; planId: string }) {
  return <GenerateFormClient initialPlan={plan} initialPlanId={planId} />
}
