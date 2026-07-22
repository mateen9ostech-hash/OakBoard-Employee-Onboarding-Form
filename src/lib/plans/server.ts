import 'server-only'

import { randomUUID } from 'node:crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { getAuthenticatedOwner, type AuthenticatedOwner } from '@/lib/auth/server'
import { planDatabaseBackend } from '@/lib/mysql/env'
import { getMySqlPool } from '@/lib/mysql/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OnboardingPlan, SavedOnboardingPlan } from '@/types/plan'

type OnboardingPlanRow = {
  id: string
  title: string
  role: string
  duration_weeks: number
  updated_at: string | Date
  plan_json: OnboardingPlan | string
}

type MySqlPlanRow = OnboardingPlanRow & RowDataPacket

function parsePlanJson(value: OnboardingPlan | string): OnboardingPlan {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as OnboardingPlan
  } catch {
    throw new Error('A stored onboarding plan contains invalid JSON.')
  }
}

export function savedPlanFromRow(row: OnboardingPlanRow): SavedOnboardingPlan {
  const nWeeks: 2 | 4 = Number(row.duration_weeks) === 4 ? 4 : 2
  const plan = parsePlanJson(row.plan_json)
  return {
    id: row.id,
    name: row.title || `${nWeeks}-Week - ${row.role || 'Untitled role'}`,
    role: row.role || 'Untitled role',
    nWeeks,
    updatedAt: new Date(row.updated_at).toISOString(),
    plan: {
      ...plan,
      id: row.id,
      nWeeks,
    },
  }
}

async function ensureMySqlUser(owner: AuthenticatedOwner) {
  const pool = getMySqlPool()
  const fallbackEmail = `${owner.id}@legacy.oakboard.invalid`
  await pool.execute(
    `INSERT INTO app_users (id, email, full_name, email_verified_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       email = VALUES(email),
       full_name = VALUES(full_name),
       updated_at = CURRENT_TIMESTAMP(3)`,
    [owner.id, owner.email || fallbackEmail, owner.fullName],
  )
}

async function getMySqlPlan(ownerId: string, planId: string) {
  const [rows] = await getMySqlPool().execute<MySqlPlanRow[]>(
    `SELECT id, title, role, duration_weeks, updated_at, plan_json
     FROM onboarding_plans
     WHERE id = ? AND owner_id = ?
     LIMIT 1`,
    [planId, ownerId],
  )
  return rows[0] ? savedPlanFromRow(rows[0]) : null
}

export async function getOwnedPlan(planId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner || !planId) return null

  if (planDatabaseBackend === 'mysql') {
    return getMySqlPlan(owner.id, planId)
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('onboarding_plans')
    .select('id,title,role,duration_weeks,updated_at,plan_json')
    .eq('id', planId)
    .eq('owner_id', owner.id)
    .maybeSingle()

  return data ? savedPlanFromRow(data as unknown as OnboardingPlanRow) : null
}

export async function listOwnedPlans(archived: boolean, limit = 20) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return []
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50)

  if (planDatabaseBackend === 'mysql') {
    await ensureMySqlUser(owner)
    const archiveClause = archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'
    const [rows] = await getMySqlPool().execute<MySqlPlanRow[]>(
      `SELECT id, title, role, duration_weeks, updated_at, plan_json
       FROM onboarding_plans
       WHERE owner_id = ? AND ${archiveClause}
       ORDER BY updated_at DESC
       LIMIT ${safeLimit}`,
      [owner.id],
    )
    return rows.map(savedPlanFromRow)
  }

  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('onboarding_plans')
    .select('id,title,role,duration_weeks,updated_at,plan_json')
    .eq('owner_id', owner.id)

  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null)
  const { data } = await query.order('updated_at', { ascending: false }).limit(safeLimit)
  return data ? (data as unknown as OnboardingPlanRow[]).map(savedPlanFromRow) : []
}

export async function getArchivedPlans() {
  return listOwnedPlans(true, 20)
}

function planPayload(plan: OnboardingPlan) {
  const nWeeks: 2 | 4 = Number(plan.nWeeks) === 4 ? 4 : 2
  return {
    title: `${nWeeks}-Week - ${plan.role.trim()}`,
    role: plan.role.trim(),
    reportsTo: (plan.reportsTo || plan.reports || '').trim(),
    collaboratesWith: (plan.collaboratesWith || plan.collab || '').trim(),
    nWeeks,
    plan: { ...plan, nWeeks },
  }
}

export async function saveOwnedPlan(plan: OnboardingPlan, planId?: string | null) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return null
  const payload = planPayload(plan)

  if (planDatabaseBackend === 'mysql') {
    await ensureMySqlUser(owner)
    const pool = getMySqlPool()
    const serializedPlan = JSON.stringify(payload.plan)

    if (planId) {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE onboarding_plans
         SET title = ?, role = ?, reports_to = ?, collaborates_with = ?,
             duration_weeks = ?, plan_json = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND owner_id = ?`,
        [
          payload.title,
          payload.role,
          payload.reportsTo,
          payload.collaboratesWith,
          payload.nWeeks,
          serializedPlan,
          planId,
          owner.id,
        ],
      )
      if (result.affectedRows === 0) return null
      return getMySqlPlan(owner.id, planId)
    }

    const id = randomUUID()
    await pool.execute(
      `INSERT INTO onboarding_plans
       (id, owner_id, title, role, reports_to, collaborates_with, duration_weeks, plan_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        owner.id,
        payload.title,
        payload.role,
        payload.reportsTo,
        payload.collaboratesWith,
        payload.nWeeks,
        serializedPlan,
      ],
    )
    return getMySqlPlan(owner.id, id)
  }

  const supabase = await createSupabaseServerClient()
  const databasePayload = {
    title: payload.title,
    role: payload.role,
    reports_to: payload.reportsTo,
    collaborates_with: payload.collaboratesWith,
    duration_weeks: payload.nWeeks,
    plan_json: payload.plan,
  }
  const saveQuery = planId
    ? supabase.from('onboarding_plans').update(databasePayload).eq('id', planId).eq('owner_id', owner.id)
    : supabase.from('onboarding_plans').insert({ owner_id: owner.id, ...databasePayload })
  const { data } = await saveQuery
    .select('id,title,role,duration_weeks,updated_at,plan_json')
    .single()

  return data ? savedPlanFromRow(data as unknown as OnboardingPlanRow) : null
}

export async function setOwnedPlanArchived(planId: string, archived: boolean) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return false

  if (planDatabaseBackend === 'mysql') {
    const [result] = await getMySqlPool().execute<ResultSetHeader>(
      `UPDATE onboarding_plans
       SET archived_at = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND owner_id = ?`,
      [archived ? new Date() : null, planId, owner.id],
    )
    return result.affectedRows > 0
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('onboarding_plans')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', planId)
    .eq('owner_id', owner.id)
    .select('id')
    .maybeSingle()
  return Boolean(data)
}

export async function deleteOwnedPlan(planId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return false

  if (planDatabaseBackend === 'mysql') {
    const [result] = await getMySqlPool().execute<ResultSetHeader>(
      'DELETE FROM onboarding_plans WHERE id = ? AND owner_id = ?',
      [planId, owner.id],
    )
    return result.affectedRows > 0
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('onboarding_plans')
    .delete()
    .eq('id', planId)
    .eq('owner_id', owner.id)
    .select('id')
    .maybeSingle()
  return Boolean(data)
}
