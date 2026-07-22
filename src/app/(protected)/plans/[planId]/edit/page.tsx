import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WorkspaceClient from '@/components/workspace-client'
import { getOwnedPlan } from '@/lib/plans/server'

type EditPlanRouteProps = {
  params: Promise<{ planId: string }>
}

export async function generateMetadata({ params }: EditPlanRouteProps): Promise<Metadata> {
  const { planId } = await params
  const savedPlan = await getOwnedPlan(planId)
  return {
    title: savedPlan ? `Edit ${savedPlan.role} Plan` : 'Edit Onboarding Plan',
  }
}

export default async function EditPlanPage({ params }: EditPlanRouteProps) {
  const { planId } = await params
  const savedPlan = await getOwnedPlan(planId)
  if (!savedPlan) notFound()

  return <WorkspaceClient initialPlan={savedPlan} initialView="edit" />
}
