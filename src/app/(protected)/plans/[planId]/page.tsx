import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOwnedPlan } from '@/lib/plans/server'
import PlanPreview from './PlanPreview'

type PlanRouteProps = {
  params: Promise<{ planId: string }>
}

export async function generateMetadata({ params }: PlanRouteProps): Promise<Metadata> {
  const { planId } = await params
  const savedPlan = await getOwnedPlan(planId)
  return {
    title: savedPlan ? `${savedPlan.role} Onboarding Plan` : 'Onboarding Plan',
  }
}

export default async function PlanPage({ params }: PlanRouteProps) {
  const { planId } = await params
  const savedPlan = await getOwnedPlan(planId)
  if (!savedPlan) notFound()

  return <PlanPreview plan={savedPlan.plan} planId={savedPlan.id} />
}
