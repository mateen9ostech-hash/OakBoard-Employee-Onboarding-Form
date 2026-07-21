import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'
import { signOut } from '../lib/auth'
import {
  deletePlanFromHistory,
  readPlanHistory,
  savePlanToHistory,
  type OnboardingPlan,
  type PlanWeek,
  type SavedOnboardingPlan,
  writeStoredPlan,
} from '../types/plan'

const DPW = 5
const DAY_TITLE_MAX = 90
const DAY_TASK_MAX = 90
const DAY_TASK_SHORT_MAX = 50
const DAY_TASK_COUNT_LONG = 4
const DAY_TASK_COUNT_SHORT = 6
const DAY_OUTCOME_MAX = 90

type ImportResult = {
  plan: {
    role?: string
    reports?: string
    collab?: string
    nWeeks?: number
    weeks: Array<{
      title?: string
      goal?: string
      days?: Array<{
        title?: string
        tasks?: string[]
        outcome?: string
      }>
    }>
  }
}

const emptyDay = (day: number) => ({
  g: day,
  localD: ((day - 1) % DPW) + 1,
  day,
  title: '',
  tasks: ['', '', '', ''],
  outcome: '',
})

const makeWeeks = (count: 2 | 4): PlanWeek[] =>
  Array.from({ length: count }, (_, weekIndex) => ({
    title: '',
    goal: '',
    days: Array.from({ length: DPW }, (_, dayIndex) => emptyDay(weekIndex * DPW + dayIndex + 1)),
  }))

const sampleWeeks: PlanWeek[] = [
  {
    title: 'Orientation & Sprint Workflow Foundation',
    goal: 'Settle in, understand the product, and learn the sprint structure end-to-end',
    days: [
      ['HR & IT System Access', ['Complete HR and IT setup to obtain necessary credentials', 'Secure active access to JIRA, SharePoint, MS Teams, and Confluence', 'Discuss role expectations and team norms', 'Meet with Senior Manager IT for context on PMO direction and leadership expectations'], 'System access ready and clear understanding of success metrics'],
      ['Sprint Workflow Review', ['Read the Sprint Execution Workflow document thoroughly from cover to cover', 'Walk through the active sprint on JIRA with the Project Manager to understand board layout', 'Review JIRA fields including dev/SQA dates, grooming flags, and story points', 'Attend the Enwage team daily standup as a passive observer'], 'Ability to explain the 15-day sprint cycle and identify healthy JIRA tickets'],
      ['Reporting Fundamentals', ['Review the Planning Report and Demo Report from the previous sprint on SharePoint', 'Learn the broader PMO scope and how the Scrum Master contributes to organizational goals', 'Study the SharePoint repository structure for SOPs and PMO documentation', 'Shadow the Project Manager during departmental coordination meetings'], 'Understanding of PMO deliverables and documentation standards'],
      ['Sprint Initiation Observation', ['Observe the Sprint Planning session including scope lock and team commitments', 'Shadow the drafting of the Sprint Planning Report for stakeholders', 'Learn about the start of the regression track for the previous sprint cycle', 'Observe the daily standup and note how the team transitions to new tasks'], 'Witnessed the formal initiation of a new 15-day sprint cycle'],
      ['Development Tracking', ['Observe the closure of the regression track', 'Note how regression bugs are reported, prioritized, and assigned to developers', 'Review Confluence decision logs and technical debt information', 'Attend daily standup and track the movement of dev tickets in JIRA'], 'Learned how regression progress is monitored and closed by the PMO'],
    ].map((day, index) => toPlanDay(index + 1, day)),
  },
  {
    title: 'Deep Dive Shadowing',
    goal: 'Follow the Project Manager through a complete sprint to understand every PMO touchpoint',
    days: [
      ['Resource Prioritization', ['Observe how development resources are re-prioritized for regression bug fixing', 'Perform a supervised JIRA audit to identify missing dates or assignees', 'Monitor daily standup specifically for early identification of blockers', "Review the current sprint's JIRA hygiene status with the Project Manager"], 'Identified JIRA hygiene gaps under direct supervision'],
      ['Grooming Introduction', ['Shadow the Project Manager during Grooming Session 1', 'Note which stakeholders attend and how the backlog is refined', 'Draft practice notes regarding key commitments and risks noted in the session', 'Attend standup and verify if blockers raised are being addressed'], 'Understanding of backlog grooming and initial risk identification'],
      ['Release Readiness', ['Learn release readiness checks during the release finalization stage', 'Draft a practice summary of one Risk Report cycle based on active sprint data', 'Understand what triggers a risk flag and how it is communicated to leadership', 'Attend standup and cross-reference JIRA ticket statuses'], 'Knowledge of release finalization and risk reporting triggers'],
      ['UAT Smoke', ['Observe the UAT Smoke session and second Grooming Session', 'Review how UAT findings are initially documented by the SQA lead', 'Draft notes from all grooming sessions attended for PM review', 'Attend daily standup to track progress against the sprint midpoint'], 'Understanding of the UAT smoke process and second grooming iteration'],
      ['Production Verification', ['Observe the SQA team during production verification of the previous release', 'See how production findings are logged and communicated', 'Perform a second supervised JIRA audit and share findings with the PM', 'Shadow the Project Manager in updating the departmental risk log'], 'Exposure to production environment validation and reporting'],
    ].map((day, index) => toPlanDay(index + 6, day)),
  },
  {
    title: 'Hands-On Practice',
    goal: 'Take responsibility for ceremonies and PMO outputs with Project Manager coaching',
    days: [
      ['Checkpoint Management', ['Run the daily standup independently with the Project Manager observing', 'Conduct an independent JIRA hygiene audit and flag gaps to the team', 'Monitor the dev completion checkpoint and track QA bucket movement', 'Update story statuses in JIRA based on standup outcomes'], 'Independent standup facilitation and completion of solo JIRA audit'],
      ['Backlog Shaping', ['Co-facilitate Grooming Session 3 and update the JIRA grooming field to Yes', 'Draft the Risk Report and review it with the Project Manager before sharing', 'Lead the standup and ensure all blockers are logged in JIRA', 'Verify that groomed stories have sufficient acceptance criteria'], 'Grooming session facilitated and professional risk report drafted'],
      ['Quality Deadlines', ['Track progress on the last primary QA day and ensure staging iteration deadlines are met', 'Run the daily standup independently and facilitate blocker resolution', 'Conduct a JIRA audit focusing on missing dev/SQA dates', 'Communicate identified hygiene gaps to the relevant team members'], 'Team updated on JIRA hygiene and QA progress toward staging'],
      ['Staging Closure', ["Co-facilitate Grooming Session 4 and finalize next sprint's backlog refinement", 'Observe and support the staging wrap-up process with SQA', 'Run the daily standup and update the PM on sprint health', 'Draft the final Risk Report for the week'], 'Final grooming session complete and staging status clearly documented'],
      ['UAT Coordination', ['Track UAT findings and coordinate resolutions with SQA and Dev leads', 'Run the daily standup solo and ensure UAT blockers are prioritized', 'Begin compiling sprint statistics and inputs for the Day 14 Demo Report', 'Review UAT outcomes with the Project Manager for stakeholder communication'], 'UAT findings documented and sprint statistics prepared for lock'],
    ].map((day, index) => toPlanDay(index + 11, day)),
  },
  {
    title: 'Independent Sprint Driver',
    goal: 'Own the full sprint cycle including ceremonies, targets, and reporting',
    days: [
      ['Sprint Lock', ['Lead the Sprint Lock Day process independently', 'Perform a comprehensive JIRA audit and compile final sprint statistics', 'Prepare the Demo Report including completed vs. planned scope and velocity', 'Facilitate the final standup of the active sprint cycle'], 'Sprint statistics and demo report finalized for stakeholder presentation'],
      ['Sprint Closure', ['Lead the Sprint Demo session independently for stakeholders', 'Coordinate and conduct the Bug Bash execution', 'Officially close the sprint in JIRA and handle any necessary spillovers', 'Send the Demo/Closure report to all stakeholders'], 'Sprint officially closed and results communicated independently'],
      ['Independent Planning', ['Lead the Sprint Planning session independently for the new cycle', 'Define sprint targets collaboratively with the Product Manager and Dev team', 'Lock the sprint scope and send the Sprint Planning Report to stakeholders', 'Initiate the regression track for the previous release'], 'New sprint cycle successfully planned and targets locked independently'],
      ['Execution Oversight', ['Drive the daily standup solo and ensure the team is aligned on Day 2 tasks', 'Resolve or escalate blockers identified during the standup on the same day', 'Maintain the daily JIRA audit log to ensure data hygiene from the start', 'Coordinate with the Technical Project Manager on early dependencies'], 'Execution track initiated with proactive blocker resolution'],
      ['Risk Visibility', ['Produce and send the Risk Report independently highlighting at-risk stories', 'Coordinate the closure of the regression cycle with the SQA Lead', 'Perform a JIRA audit and proactively chase missing dates or assignees', 'Lead the daily standup and track dev progress against the Planning Report'], 'Risk visibility established and regression track closed on schedule'],
    ].map((day, index) => toPlanDay(index + 16, day)),
  },
]

function toPlanDay(day: number, data: unknown[]) {
  return {
    ...emptyDay(day),
    title: limitText(String(data[0] ?? ''), DAY_TITLE_MAX),
    tasks: limitTasks(data[1]),
    outcome: limitText(String(data[2] ?? ''), DAY_OUTCOME_MAX),
  }
}

function limitText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max)
}

function limitTasks(tasks: unknown) {
  const clean = (Array.isArray(tasks) ? tasks : [])
    .map((task) => limitText(task, DAY_TASK_MAX))
    .filter(Boolean)
  const max = clean.some((task) => task.length > DAY_TASK_SHORT_MAX)
    ? DAY_TASK_COUNT_LONG
    : DAY_TASK_COUNT_SHORT
  return clean.slice(0, max)
}

function extractLabel(source: string, labels: string[]) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = source.match(new RegExp(`^\\s*${escaped}\\s*:\\s*(.+)$`, 'im'))
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

function isMissingValue(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase()
  return !text || ['n/a', 'not specified', 'not in source', 'untitled role', 'new role'].includes(text)
}

function fallbackRole(source: string) {
  return extractLabel(source, ['Role', 'Position', 'Job Title', 'Designation'])
    || source.match(/(?:Role|Position|Job Title|Designation)\s*[:-]\s*([^\n]+)/i)?.[1]?.trim()
    || ''
}

function fallbackReports(source: string) {
  return extractLabel(source, ['Reports To', 'Reporting To', 'Manager', 'Supervisor'])
    || source.match(/(?:reports?\s+to|reporting\s+to|manager|supervisor)\s*[:-]\s*([^\n]+)/i)?.[1]?.trim()
    || ''
}

function fallbackCollaborators(source: string) {
  return extractLabel(source, ['Collaborates With', 'Collaborators', 'Works With', 'Stakeholders', 'Teams'])
    || source.match(/(?:collaborates?\s+with|works?\s+with|stakeholders|teams)\s*[:-]\s*([^\n]+)/i)?.[1]?.trim()
    || ''
}

function cleanDayTitle(value: unknown, fallback = '') {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/^day\s+\d+\s*[:\-–—]?\s*/i, '')
    .replace(/\s*-\s*day\s+\d+\s*:\s*/i, ': ')
    .replace(/^training\s*[:\-–—]?\s*/i, '')
    .replace(/\s+training$/i, '')
    .replace(/\bday\s+\d+\s+training\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const isGeneric = /^(practice role focus|role-specific practice|progress review|daily onboarding progress)$/i.test(cleaned)
  return limitText(!isGeneric && cleaned ? cleaned : fallback, DAY_TITLE_MAX)
}

function cleanOutcome(value: unknown, fallback = '') {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/^day\s+\d+\s+milestone\s*:\s*/i, '')
    .replace(/^day\s+\d+\s*[:\-–—]?\s*/i, '')
    .replace(/\s+day\s+\d+\s+milestone\s+completed$/i, ' completed')
    .replace(/\s+/g, ' ')
    .trim()
  return limitText(cleaned || fallback, DAY_OUTCOME_MAX)
}

function cleanWeekTitle(value: unknown) {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/^week\s+\d+\s*[:\-–—]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return limitText(cleaned || `Training Plan`, 90)
}

function normalizeNotebookText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .trim()
}

function parseNotebookPlan(rawValue: string): ImportResult['plan'] {
  const source = normalizeNotebookText(rawValue)
  const weekRegex = /Week\s+Title\s*:\s*(?:Week\s+)?(\d+)?\s*[—–-]?\s*([^\n]+)\n(?:Objective|Goal)\s*:\s*([^\n]+)([\s\S]*?)(?=Week\s+Title\s*:|$)/gi
  const weeks: ImportResult['plan']['weeks'] = []
  let weekMatch: RegExpExecArray | null

  while ((weekMatch = weekRegex.exec(source)) !== null) {
    const weekTitle = cleanWeekTitle(weekMatch[2].trim())
    const goal = limitText(weekMatch[3], 140)
    const body = weekMatch[4].trim()
    const dayStarts = [...body.matchAll(/^Day\s+(\d+)(?:\s+([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}\s+\([^)]+\)|[0-9]{4}-[0-9]{2}-[0-9]{2}))?.*$/gim)]
    const days: NonNullable<ImportResult['plan']['weeks'][number]['days']> = []

    dayStarts.forEach((dayStart, index) => {
      const blockStart = dayStart.index ?? 0
      const blockEnd = index + 1 < dayStarts.length ? dayStarts[index + 1].index ?? body.length : body.length
      const block = body.slice(blockStart, blockEnd)
      const title = block.match(/Day\s+Goal\s*:\s*([^\n]+)/i)?.[1] || ''
      const taskBlock = block.match(/Tasks\s*:\s*([\s\S]*?)Day\s+Outcome\s*:/i)?.[1] || ''
      const outcome = block.match(/Day\s+Outcome\s*:\s*([^\n]+)/i)?.[1] || ''
      if (!title && !taskBlock && !outcome) return
      const tasks = taskBlock
        .split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean)
      days.push({
        title: cleanDayTitle(title),
        tasks: limitTasks(tasks),
        outcome: cleanOutcome(outcome),
      })
    })

    weeks.push({ title: weekTitle, goal, days })
  }

  if (!weeks.length || weeks.every((week) => !week.days?.length)) {
    throw new Error('NotebookLM data format was not recognized. Paste the output with Week Title, Objective, Day Goal, Tasks, and Day Outcome labels.')
  }

  const parsedDayCount = weeks.reduce((total, week) => total + (week.days?.length || 0), 0)
  const requestedWeeks = weeks.length >= 4 || parsedDayCount > DPW * 2 ? 4 : 2
  return {
    role: fallbackRole(source),
    reports: fallbackReports(source),
    collab: fallbackCollaborators(source),
    nWeeks: requestedWeeks,
    weeks,
  }
}

function nextWeekdayIso() {
  const date = new Date()
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

function workdays(startStr: string, count: number) {
  const dates: Date[] = []
  const date = startStr ? new Date(`${startStr}T00:00:00`) : new Date()
  while (dates.length < count) {
    if (date.getDay() !== 0 && date.getDay() !== 6) dates.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return dates
}

function fmtShort(date?: Date) {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function FillDetailsPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [startDate, setStartDate] = useState(nextWeekdayIso())
  const [reports, setReports] = useState('')
  const [collab, setCollab] = useState('')
  const [nWeeks, setNWeeks] = useState<2 | 4>(2)
  const [weeks, setWeeks] = useState<PlanWeek[]>(makeWeeks(2))
  const [openWeeks, setOpenWeeks] = useState(() => new Set([0]))
  const [openDays, setOpenDays] = useState(() => new Set<number>())
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importStatus, setImportStatus] = useState<{ type: 'info' | 'error'; message: string } | null>(null)
  const [savedPlans, setSavedPlans] = useState<SavedOnboardingPlan[]>(() => readPlanHistory())

  const dates = useMemo(() => workdays(startDate, nWeeks * DPW), [startDate, nWeeks])

  function setDuration(next: 2 | 4) {
    setNWeeks(next)
    setWeeks((current) => {
      const target = makeWeeks(next)
      current.slice(0, next).forEach((week, index) => {
        target[index] = week
      })
      return target
    })
  }

  function updateWeek(index: number, patch: Partial<PlanWeek>) {
    setWeeks((current) => current.map((week, wi) => (wi === index ? { ...week, ...patch } : week)))
  }

  function updateDay(weekIndex: number, dayIndex: number, patch: Partial<PlanWeek['days'][number]>) {
    setWeeks((current) =>
      current.map((week, wi) =>
        wi === weekIndex
          ? {
              ...week,
              days: week.days.map((day, di) => (di === dayIndex ? { ...day, ...patch } : day)),
            }
          : week,
      ),
    )
  }

  function updateTask(weekIndex: number, dayIndex: number, taskIndex: number, value: string) {
    updateDay(weekIndex, dayIndex, {
      tasks: weeks[weekIndex].days[dayIndex].tasks.map((task, index) =>
        index === taskIndex ? limitText(value, DAY_TASK_MAX) : task,
      ),
    })
  }

  function addTask(weekIndex: number, dayIndex: number) {
    const tasks = weeks[weekIndex].days[dayIndex].tasks
    const max = tasks.every((task) => task.length <= DAY_TASK_SHORT_MAX)
      ? DAY_TASK_COUNT_SHORT
      : DAY_TASK_COUNT_LONG
    if (tasks.length >= max) return
    updateDay(weekIndex, dayIndex, { tasks: [...tasks, ''] })
  }

  function removeTask(weekIndex: number, dayIndex: number, taskIndex: number) {
    const tasks = weeks[weekIndex].days[dayIndex].tasks
    if (tasks.length <= 1) return
    updateDay(weekIndex, dayIndex, { tasks: tasks.filter((_, index) => index !== taskIndex) })
  }

  function toggleWeek(index: number) {
    setOpenWeeks((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function toggleDay(day: number) {
    setOpenDays((current) => {
      const next = new Set(current)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  function fillDemoData() {
    setRole('Scrum Master Intern')
    setReports('Project Manager')
    setCollab('PMO Team')
    setStartDate('2026-06-22')
    setWeeks(sampleWeeks.slice(0, nWeeks).map((week) => ({ ...week, days: week.days.map((day) => ({ ...day })) })))
    setNotice('Sample plan filled. Review it before generating.')
    setError('')
  }

  function resetAll() {
    setRole('')
    setReports('')
    setCollab('')
    setStartDate(nextWeekdayIso())
    setWeeks(makeWeeks(nWeeks))
    setError('')
    setNotice('')
  }

  function loadSavedPlan(saved: SavedOnboardingPlan) {
    const plan = saved.plan
    const loadedWeeks = Number(plan.nWeeks) === 4 ? 4 : 2
    setDuration(loadedWeeks)
    setRole(plan.role || '')
    setReports(plan.reportsTo || plan.reports || '')
    setCollab(plan.collaboratesWith || plan.collab || '')
    setStartDate(plan.startDate || nextWeekdayIso())

    const restoredWeeks = makeWeeks(loadedWeeks)
    ;(plan.weeks || []).slice(0, loadedWeeks).forEach((week, wi) => {
      restoredWeeks[wi].title = week.title || ''
      restoredWeeks[wi].goal = week.goal || ''
      week.days.slice(0, DPW).forEach((day, di) => {
        restoredWeeks[wi].days[di] = {
          ...restoredWeeks[wi].days[di],
          title: day.title || '',
          tasks: day.tasks?.length ? day.tasks : ['', '', '', ''],
          outcome: day.outcome || '',
        }
      })
    })
    setWeeks(restoredWeeks)
    setOpenWeeks(new Set(Array.from({ length: loadedWeeks }, (_, index) => index)))
    setOpenDays(new Set())
    setError('')
    setNotice(`Loaded saved plan: ${saved.name}`)
  }

  function removeSavedPlan(id: string) {
    setSavedPlans(deletePlanFromHistory(id))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function collect(): OnboardingPlan {
    const planDates = workdays(startDate, nWeeks * DPW)
    const normalizedWeeks = weeks.slice(0, nWeeks).map((week, wi) => ({
      ...week,
      title: cleanWeekTitle(week.title || 'Training Plan'),
      days: week.days.slice(0, DPW).map((day, di) => {
        const g = wi * DPW + di + 1
        return {
          ...day,
          g,
          localD: di + 1,
          day: g,
          date: planDates[g - 1],
          title: limitText(day.title, DAY_TITLE_MAX),
          tasks: limitTasks(day.tasks),
          outcome: limitText(day.outcome, DAY_OUTCOME_MAX),
        }
      }),
    }))

    return {
      company: 'Oak Street Technologies',
      role: role.trim(),
      reports: reports.trim(),
      reportsTo: reports.trim(),
      collab: collab.trim(),
      collaboratesWith: collab.trim(),
      nWeeks,
      startDate,
      weeks: normalizedWeeks,
      days: normalizedWeeks.flatMap((week) => week.days),
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const plan = collect()
    if (!plan.role) {
      setError('Please enter the Job Title / Role.')
      return
    }
    const missing = plan.weeks?.flatMap((week) => week.days).find((day) => !day.title)
    if (missing) {
      setError(`Please fill in the title for Day ${missing.g || missing.day}.`)
      return
    }

    writeStoredPlan(plan)
    setSavedPlans(savePlanToHistory(plan))
    navigate('/generate-form')
  }

  function applyImportedPlan(plan: ImportResult['plan']) {
    const importedWeeks = Number(plan.nWeeks) === 4 ? 4 : 2
    const source = importText
    setDuration(importedWeeks)
    setRole(limitText(isMissingValue(plan.role) ? fallbackRole(source) : plan.role, 80))
    setReports(limitText(isMissingValue(plan.reports) ? fallbackReports(source) : plan.reports, 120))
    setCollab(limitText(isMissingValue(plan.collab) ? fallbackCollaborators(source) : plan.collab, 160))
    const nextWeeks = makeWeeks(importedWeeks)
    plan.weeks.slice(0, importedWeeks).forEach((week, wi) => {
      nextWeeks[wi].title = cleanWeekTitle(week.title)
      nextWeeks[wi].goal = limitText(week.goal, 140)
      ;(week.days || []).slice(0, DPW).forEach((day, di) => {
        const titleFallback = Array.isArray(day.tasks)
          ? String(day.tasks[0] || '').replace(/^(complete|review|practice)\s+/i, '').split(/[.;:,-]/)[0].trim()
          : ''
        nextWeeks[wi].days[di] = {
          ...nextWeeks[wi].days[di],
          title: cleanDayTitle(day.title, titleFallback),
          tasks: limitTasks(day.tasks),
          outcome: cleanOutcome(day.outcome),
        }
      })
    })
    setWeeks(nextWeeks)
    setOpenWeeks(new Set(Array.from({ length: importedWeeks }, (_, index) => index)))
  }

  function parseImportedPlan() {
    const rawText = importText.trim()
    if (rawText.length < 40) {
      setImportStatus({ type: 'error', message: 'Please paste the NotebookLM output first.' })
      return
    }

    try {
      const plan = parseNotebookPlan(rawText)
      applyImportedPlan(plan)
      setImportOpen(false)
      setNotice(`${plan.nWeeks}-week NotebookLM data imported locally. Please review before generating.`)
      setError('')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The NotebookLM data could not be imported.'
      setImportStatus({ type: 'error', message })
    }
  }

  return (
    <main className="form-page">
      <header className="hdr">
        <div className="hdr-brand">
          <div className="hdr-icon">
            <img src="/oakboard-logo.svg" alt="" />
          </div>
          OakBoard
        </div>
        <div className="hdr-actions">
          <div className="hdr-steps">
            <div className="hdr-step active"><div className="hdr-sn">1</div><span className="hdr-sl">Fill Details</span></div>
            <div className="hdr-sep" />
            <div className="hdr-step"><div className="hdr-sn">2</div><span className="hdr-sl">Preview & Export</span></div>
          </div>
        </div>
      </header>

      <div className="fill-shell">
        <aside className="recent-sidebar" aria-label="OakBoard sidebar">
          <div className="side-brand">
            <div className="side-logo"><img src="/oakboard-logo.svg" alt="" /></div>
            <div>
              <strong>OakBoard</strong>
              <span>Onboarding Forms</span>
            </div>
          </div>

          <div className="side-workspace">
            <span className="side-dot" />
            <div>
              <strong>Oak Street Workspace</strong>
              <span>Local draft mode</span>
            </div>
          </div>

          <nav className="side-nav" aria-label="Form sections">
            <span className="side-label">Main Menu</span>
            <a className="side-nav-item active" href="#plan-duration"><span>□</span>Plan setup</a>
            <a className="side-nav-item" href="#role-info"><span>◇</span>Role information</a>
            <a className="side-nav-item" href="#weekly-plans"><span>☰</span>Weeks & days</a>
            <button className="side-nav-item" onClick={() => setImportOpen(true)} type="button"><span>⇣</span>Import NotebookLM</button>
          </nav>

          <div className="recent-sidebar-head">
            <span className="side-label">Recent Plans</span>
            <span>{savedPlans.length ? 'Load previous work' : 'No saved plans yet'}</span>
          </div>

          <div className="recent-plans">
            {savedPlans.length > 0 &&
              savedPlans.map((saved) => (
                <article className="recent-card" key={saved.id}>
                  <button className="recent-load" onClick={() => loadSavedPlan(saved)} type="button">
                    <strong>{saved.name}</strong>
                    <span>
                      {new Date(saved.updatedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </button>
                  <button className="recent-remove" onClick={() => removeSavedPlan(saved.id)} title="Remove saved plan" type="button">×</button>
                </article>
              ))}
            {savedPlans.length === 0 && (
              <div className="recent-empty">Generate a plan once and it will appear here for quick reuse.</div>
            )}
          </div>

          <div className="side-footer">
            <button className="side-footer-item" onClick={resetAll} type="button">Reset form</button>
            <button className="side-footer-item danger" onClick={handleSignOut} type="button">Sign out</button>
          </div>
        </aside>

        <form className="fo" onSubmit={handleSubmit}>
        <div className="fi">
          <h1>Create Onboarding Plan</h1>
          <p>Fill in role details and expand each day to add topic, tasks and outcome. The PDF output matches your exact template design.</p>
        </div>

        <section className="sec" id="plan-duration">
          <div className="sec-h"><div className="sec-ic">+</div><span className="sec-t">Plan Duration</span></div>
          <div className="sec-b">
            <div className="dur-row">
              {[2, 4].map((value) => (
                <button className={`dur-opt ${nWeeks === value ? 'sel' : ''}`} key={value} onClick={() => setDuration(value as 2 | 4)} type="button">
                  <span className="dur-rd"><span className="dur-dot" /></span>
                  <span className="dur-txt"><strong>{value}-Week Plan</strong><span>{value * 5} working days</span></span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="sec" id="role-info">
          <div className="sec-h"><div className="sec-ic">i</div><span className="sec-t">Role Information</span></div>
          <div className="sec-b">
            <div className="row r3">
              <div className="fld"><label>Job Title / Role *</label><input onChange={(event) => setRole(event.target.value)} placeholder="Job title" value={role} /></div>
              <div className="fld"><label>Start Date</label><input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} /></div>
              <div className="fld"><label>Reports To</label><input onChange={(event) => setReports(event.target.value)} placeholder="Manager name" value={reports} /></div>
              <div className="fld"><label>Collaborates With</label><input onChange={(event) => setCollab(event.target.value)} placeholder="Team or person" value={collab} /></div>
            </div>
          </div>
        </section>

        <section className="sec" id="weekly-plans">
          <div className="sec-h"><div className="sec-ic">≡</div><span className="sec-t">Weeks & Daily Plans</span></div>
          <div className="sec-b">
            {weeks.slice(0, nWeeks).map((week, wi) => (
              <div className="wb" key={wi}>
                <button className="wt" onClick={() => toggleWeek(wi)} type="button">
                  <span className="wbg">Week {wi + 1}</span>
                  <span className="wp">{week.title || 'Expand to fill week details'}</span>
                  <span className={`wa ${openWeeks.has(wi) ? 'open' : ''}`}>⌄</span>
                </button>
                {openWeeks.has(wi) && (
                  <div className="wi open">
                    <div className="wtr">
                      <div className="row r2">
                        <div className="fld"><label>Week {wi + 1} Title *</label><input onChange={(event) => updateWeek(wi, { title: limitText(event.target.value, 90) })} placeholder="Section title" value={week.title} /></div>
                        <div className="fld"><label>Week {wi + 1} Goal</label><input onChange={(event) => updateWeek(wi, { goal: limitText(event.target.value, 140) })} placeholder="Week goal" value={week.goal || ''} /></div>
                      </div>
                    </div>
                    {week.days.map((day, di) => {
                      const globalDay = wi * DPW + di + 1
                      const maxTasks = day.tasks.every((task) => task.length <= DAY_TASK_SHORT_MAX) ? DAY_TASK_COUNT_SHORT : DAY_TASK_COUNT_LONG
                      return (
                        <div className="db" key={globalDay}>
                          <button className="dt" onClick={() => toggleDay(globalDay)} type="button">
                            <span className="dnb">Day {globalDay}</span>
                            <span className="ddl">{fmtShort(dates[globalDay - 1])}</span>
                            <span className="dtp">{day.title || 'Click to fill day details'}</span>
                            <span className={`dcd ${day.title && day.outcome ? 'filled' : ''}`} />
                            <span className={`da ${openDays.has(globalDay) ? 'open' : ''}`}>⌄</span>
                          </button>
                          {openDays.has(globalDay) && (
                            <div className="din open">
                              <div className="fld">
                                <label>Day {globalDay} Title *</label>
                                <input maxLength={DAY_TITLE_MAX} onChange={(event) => updateDay(wi, di, { title: event.target.value })} placeholder="Day title" value={day.title} />
                                <span className="cc">{day.title.length} / {DAY_TITLE_MAX}</span>
                              </div>
                              <div className="tl">Tasks / Activities</div>
                              {day.tasks.map((task, ti) => (
                                <div className="tr2" key={`${globalDay}-${ti}`}>
                                  <span className="tn">{ti + 1}</span>
                                  <input maxLength={DAY_TASK_MAX} onChange={(event) => updateTask(wi, di, ti, event.target.value)} placeholder="Type here" value={task} />
                                  <button className="btn-del-task" onClick={() => removeTask(wi, di, ti)} title="Remove task" type="button">×</button>
                                </div>
                              ))}
                              <button className="btn-at" disabled={day.tasks.length >= maxTasks} onClick={() => addTask(wi, di)} type="button">+ Add another task</button>
                              <div className="ow">
                                <div className="fld">
                                  <label>Day Outcome *</label>
                                  <textarea maxLength={DAY_OUTCOME_MAX} onChange={(event) => updateDay(wi, di, { outcome: event.target.value })} placeholder="Success criteria" value={day.outcome} />
                                  <span className="cc">{day.outcome.length} / {DAY_OUTCOME_MAX}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {(error || notice) && <div className={`err on ${notice ? 'ok' : ''}`}>{error || notice}</div>}

        <div className="form-actions">
          <Button onClick={resetAll} type="button" variant="secondary">Reset</Button>
          <Button icon="check" onClick={fillDemoData} type="button" variant="soft">Fill Sample Plan</Button>
          <Button icon="download" onClick={() => setImportOpen(true)} type="button" variant="secondary">Import NotebookLM Data</Button>
          <Button icon="plus" type="submit" variant="primary">Generate Plan</Button>
        </div>
        </form>
      </div>

      {importOpen && (
        <div className="import-overlay on" onClick={(event) => event.target === event.currentTarget && setImportOpen(false)}>
          <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="import-head">
              <div><h2 id="import-title">Import NotebookLM Data</h2><p>Paste the structured output from NotebookLM. OakBoard will place Role, Weeks, Day Goals, Tasks, and Outcomes into the form.</p></div>
              <button className="import-close" onClick={() => setImportOpen(false)} type="button">×</button>
            </div>
            <div className="import-body">
              <section className="import-step">
                <div className="import-step-title"><span>1</span><strong>Paste NotebookLM output</strong></div>
                <div className="import-field">
                  <label>NotebookLM content *</label>
                  <textarea
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder="Paste NotebookLM output here. Expected labels: Role, Reports To, Collaborates With, Week Title, Objective, Day Goal, Tasks, Day Outcome..."
                    value={importText}
                  />
                  <span className="import-help">OakBoard will auto-detect 2-week or 4-week plans from the pasted Week and Day labels.</span>
                </div>
              </section>
              {importStatus && <div className={`import-status on ${importStatus.type}`}>{importStatus.message}</div>}
            </div>
            <div className="import-actions">
              <button className="import-cancel" onClick={() => setImportOpen(false)} type="button">Cancel</button>
              <button className="import-submit" onClick={parseImportedPlan} type="button">Fill Form</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
