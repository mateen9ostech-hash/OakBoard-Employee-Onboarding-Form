import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OnboardingPlan, SavedOnboardingPlan } from '@/types/plan'

type OnboardingPlanRow = {
  id: string
  title: string
  role: string
  duration_weeks: number
  updated_at: string
  plan_json: OnboardingPlan
}

function savedPlanFromRow(row: OnboardingPlanRow): SavedOnboardingPlan {
  const nWeeks: 2 | 4 = Number(row.duration_weeks) === 4 ? 4 : 2
  return {
    id: row.id,
    name: row.title || `${nWeeks}-Week - ${row.role || 'Untitled role'}`,
    role: row.role || 'Untitled role',
    nWeeks,
    updatedAt: row.updated_at,
    plan: {
      ...row.plan_json,
      id: row.id,
      nWeeks,
    },
  }
}

async function getOwnerContext() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const ownerId = typeof data?.claims?.sub === 'string' ? data.claims.sub : ''
  return { supabase, ownerId, error }
}

export async function getOwnedPlan(planId: string) {
  const { supabase, ownerId, error } = await getOwnerContext()
  if (error || !ownerId || !planId) return null

  const { data } = await supabase
    .from('onboarding_plans')
    .select('id,title,role,duration_weeks,updated_at,plan_json')
    .eq('id', planId)
    .eq('owner_id', ownerId)
    .maybeSingle()

  return data ? savedPlanFromRow(data as unknown as OnboardingPlanRow) : null
}

export async function getArchivedPlans() {
  const { supabase, ownerId, error } = await getOwnerContext()
  if (error || !ownerId) return []

  const { data } = await supabase
    .from('onboarding_plans')
    .select('id,title,role,duration_weeks,updated_at,plan_json')
    .eq('owner_id', ownerId)
    .not('archived_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(20)

  return data ? (data as unknown as OnboardingPlanRow[]).map(savedPlanFromRow) : []
}
