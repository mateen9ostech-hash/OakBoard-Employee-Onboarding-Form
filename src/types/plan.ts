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
  id?: string
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

const PLAN_STORAGE_KEY = 'obf_plan_data'
const PLAN_EDIT_INTENT_KEY = 'obf_edit_plan'

export type SavedOnboardingPlan = {
  id: string
  name: string
  role: string
  nWeeks: 2 | 4
  updatedAt: string
  plan: OnboardingPlan
}

export function readStoredPlan(): OnboardingPlan | null {
  if (typeof window === 'undefined') return null

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
  if (typeof window === 'undefined') return

  const serialized = JSON.stringify(plan)
  localStorage.setItem(PLAN_STORAGE_KEY, serialized)
  sessionStorage.setItem(PLAN_STORAGE_KEY, serialized)
}

export function requestStoredPlanEdit() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PLAN_EDIT_INTENT_KEY, '1')
}

export function hasStoredPlanEditIntent() {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(PLAN_EDIT_INTENT_KEY) === '1'
}

export function clearStoredPlanEditIntent() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PLAN_EDIT_INTENT_KEY)
}
