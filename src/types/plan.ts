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

export type PlanDurationWeeks = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export function normalizePlanDuration(value: unknown): PlanDurationWeeks {
  const weeks = Math.trunc(Number(value))
  return Math.min(8, Math.max(1, Number.isFinite(weeks) ? weeks : 2)) as PlanDurationWeeks
}

export type OnboardingPlan = {
  id?: string
  company?: string
  role: string
  reports?: string
  reportsTo: string
  collab?: string
  collaboratesWith: string
  nWeeks: PlanDurationWeeks
  startDate?: string
  weeks?: PlanWeek[]
  days?: PlanDay[]
}

const PLAN_STORAGE_KEY = 'obf_plan_data'

export type SavedOnboardingPlan = {
  id: string
  name: string
  role: string
  nWeeks: PlanDurationWeeks
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
