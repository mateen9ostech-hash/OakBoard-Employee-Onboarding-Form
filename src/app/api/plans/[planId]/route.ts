import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedOwner } from '@/lib/auth/server'
import { deleteOwnedPlan, getOwnedPlan, saveOwnedPlan, setOwnedPlanArchived } from '@/lib/plans/server'
import type { OnboardingPlan } from '@/types/plan'

export const runtime = 'nodejs'

type PlanRouteContext = {
  params: Promise<{ planId: string }>
}

function isPlan(value: unknown): value is OnboardingPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<OnboardingPlan>
  return typeof plan.role === 'string' && (Number(plan.nWeeks) === 2 || Number(plan.nWeeks) === 4)
}

async function authorize() {
  return Boolean(await getAuthenticatedOwner())
}

export async function GET(_request: NextRequest, { params }: PlanRouteContext) {
  if (!await authorize()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { planId } = await params

  try {
    const plan = await getOwnedPlan(planId)
    if (!plan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Failed to load onboarding plan.', error)
    return NextResponse.json({ error: 'Plan could not be loaded.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: PlanRouteContext) {
  if (!await authorize()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { planId } = await params
  const body = await request.json().catch(() => null) as {
    action?: 'archive' | 'restore'
    plan?: unknown
  } | null

  try {
    if (body?.action === 'archive' || body?.action === 'restore') {
      const updated = await setOwnedPlanArchived(planId, body.action === 'archive')
      if (!updated) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    if (!isPlan(body?.plan)) {
      return NextResponse.json({ error: 'A valid action or onboarding plan is required.' }, { status: 400 })
    }

    const savedPlan = await saveOwnedPlan(body.plan, planId)
    if (!savedPlan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
    return NextResponse.json({ plan: savedPlan })
  } catch (error) {
    console.error('Failed to update onboarding plan.', error)
    return NextResponse.json({ error: 'Plan could not be updated.' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: PlanRouteContext) {
  if (!await authorize()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { planId } = await params

  try {
    const removed = await deleteOwnedPlan(planId)
    if (!removed) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to delete onboarding plan.', error)
    return NextResponse.json({ error: 'Plan could not be deleted.' }, { status: 500 })
  }
}
