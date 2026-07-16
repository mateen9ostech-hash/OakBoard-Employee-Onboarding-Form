export type PlanDay = {
  g?: number
  localD?: number
  day: number
  date?: string | Date
  title: string
  tasks: string[]
  outcome: string
}

export type PlanWeek = {
  title: string
  goal?: string
  subtitle?: string
  days: PlanDay[]
}

export type OnboardingPlan = {
  company?: string
  role: string
  reports?: string
  reportsTo: string
  collab?: string
  collaboratesWith: string
  nWeeks: 2 | 4
  startDate?: string
  weeks?: PlanWeek[]
  days?: PlanDay[]
}

export const PLAN_STORAGE_KEY = 'obf_plan_data'
export const PLAN_HISTORY_KEY = 'obf_plan_history'

export type SavedOnboardingPlan = {
  id: string
  name: string
  role: string
  nWeeks: 2 | 4
  updatedAt: string
  plan: OnboardingPlan
}

export function readStoredPlan(): OnboardingPlan | null {
  const raw =
    sessionStorage.getItem(PLAN_STORAGE_KEY) || localStorage.getItem(PLAN_STORAGE_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as OnboardingPlan
  } catch {
    return null
  }
}

export function writeStoredPlan(plan: OnboardingPlan) {
  const serialized = JSON.stringify(plan)
  localStorage.setItem(PLAN_STORAGE_KEY, serialized)
  sessionStorage.setItem(PLAN_STORAGE_KEY, serialized)
}

export function readPlanHistory(): SavedOnboardingPlan[] {
  const raw = localStorage.getItem(PLAN_HISTORY_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as SavedOnboardingPlan[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.id && item?.plan)
      .slice(0, 12)
  } catch {
    return []
  }
}

export function savePlanToHistory(plan: OnboardingPlan) {
  const role = plan.role?.trim() || 'Untitled role'
  const startDate = plan.startDate || ''
  const id = `${role.toLowerCase()}__${plan.nWeeks}__${startDate}`.replace(/[^a-z0-9_/-]+/g, '-')
  const entry: SavedOnboardingPlan = {
    id,
    name: `${plan.nWeeks}-Week · ${role}`,
    role,
    nWeeks: plan.nWeeks,
    updatedAt: new Date().toISOString(),
    plan,
  }
  const history = [entry, ...readPlanHistory().filter((item) => item.id !== id)].slice(0, 8)
  localStorage.setItem(PLAN_HISTORY_KEY, JSON.stringify(history))
  return history
}

export function deletePlanFromHistory(id: string) {
  const history = readPlanHistory().filter((item) => item.id !== id)
  localStorage.setItem(PLAN_HISTORY_KEY, JSON.stringify(history))
  return history
}
