import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedOwner } from '@/lib/auth/server'
import { listOwnedPlans, saveOwnedPlan } from '@/lib/plans/server'
import type { OnboardingPlan } from '@/types/plan'

export const runtime = 'nodejs'

function isPlan(value: unknown): value is OnboardingPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<OnboardingPlan>
  return typeof plan.role === 'string' && (Number(plan.nWeeks) === 2 || Number(plan.nWeeks) === 4)
}

export async function GET(request: NextRequest) {
  if (!await getAuthenticatedOwner()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const archived = request.nextUrl.searchParams.get('archived') === 'true'
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || (archived ? 20 : 8))

  try {
    const plans = await listOwnedPlans(archived, requestedLimit)
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Failed to list onboarding plans.', error)
    return NextResponse.json({ error: 'Plans could not be loaded.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!await getAuthenticatedOwner()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as { plan?: unknown } | null
  if (!isPlan(body?.plan)) {
    return NextResponse.json({ error: 'A valid onboarding plan is required.' }, { status: 400 })
  }

  try {
    const savedPlan = await saveOwnedPlan(body.plan)
    if (!savedPlan) return NextResponse.json({ error: 'Plan could not be saved.' }, { status: 500 })
    return NextResponse.json({ plan: savedPlan }, { status: 201 })
  } catch (error) {
    console.error('Failed to create onboarding plan.', error)
    return NextResponse.json({ error: 'Plan could not be saved.' }, { status: 500 })
  }
}
