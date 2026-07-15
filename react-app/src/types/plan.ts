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
