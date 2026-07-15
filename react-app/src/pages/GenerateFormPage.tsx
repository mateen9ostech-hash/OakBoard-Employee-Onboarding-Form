import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { type PlanDay, type PlanWeek, readStoredPlan } from '../types/plan'

const DAY_TITLE_MAX = 90
const DAY_TASK_MAX = 90
const DAY_TASK_SHORT_MAX = 50
const DAY_TASK_COUNT_LONG = 4
const DAY_TASK_COUNT_SHORT = 6
const DAY_OUTCOME_MAX = 90

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

function formatDate(date: unknown) {
  if (!date) return ''
  const parsed = date instanceof Date ? date : new Date(String(date))
  if (Number.isNaN(parsed.getTime())) return String(date)
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    weekday: 'short',
  })
}

function fitClass(title: string, tasks: string[], outcome: string) {
  const totalChars = title.length + outcome.length + tasks.reduce((sum, task) => sum + task.length, 0)
  if (tasks.length >= 6 || totalChars > 370) return ' ultra'
  if (tasks.length >= 5 || totalChars > 290) return ' dense'
  return ''
}

function TitleIcon() {
  return (
    <svg className="pdc-icon" viewBox="0 0 16 16" fill="none">
      <path d="M8 14.666A6.666 6.666 0 1 0 8 1.334a6.666 6.666 0 0 0 0 13.332Z" stroke="#02621C" strokeWidth="1.333" />
      <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="#02621C" strokeWidth="1.333" />
      <path d="M8 9.334a1.333 1.333 0 1 0 0-2.667 1.333 1.333 0 0 0 0 2.667Z" stroke="#02621C" strokeWidth="1.333" />
    </svg>
  )
}

function OutcomeIcon() {
  return (
    <svg className="pdc-icon" viewBox="0 0 16 16" fill="none">
      <path d="M8 14.666A6.666 6.666 0 1 0 8 1.334a6.666 6.666 0 0 0 0 13.332Z" stroke="#02621C" strokeWidth="1.333" />
      <path d="M6 8l1.333 1.334L10 6.667" stroke="#02621C" strokeWidth="1.333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DayCard({ day }: { day: PlanDay }) {
  const title = limitText(day.title, DAY_TITLE_MAX)
  const tasks = limitTasks(day.tasks)
  const outcome = limitText(day.outcome, DAY_OUTCOME_MAX)
  const cardClass = fitClass(title, tasks, outcome)
  const dayNumber = day.g || day.day

  return (
    <article className={`pdc${cardClass}`}>
      <div className="pdc-top">
        <span className="pdc-badge">Day {dayNumber}</span>
        <span className="pdc-date">{formatDate(day.date)}</span>
      </div>
      <div className="pdc-topic-row">
        <TitleIcon />
        <span className="pdc-topic-txt">{title || 'Day title'}</span>
      </div>
      <div className="pdc-tasks-area">
        <img className="pdc-icon" src="/task-icon.svg" alt="" />
        <div className="pdc-tasks-list">
          {tasks.map((task) => (
            <div className="pdc-task" key={task}>
              <span className="ptb">•</span>
              <span className="ptt">{task}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pdc-out">
        <OutcomeIcon />
        <span className="pot">{outcome || 'Outcome'}</span>
      </div>
    </article>
  )
}

function PlanPage({
  pageWeeks,
  pageIndex,
  role,
  reports,
  collab,
  nWeeks,
}: {
  pageWeeks: PlanWeek[]
  pageIndex: number
  role: string
  reports: string
  collab: string
  nWeeks: 2 | 4
}) {
  const planName = nWeeks === 4 ? 'Four-Week' : 'Two-Week'

  return (
    <section className="plan-doc-react" aria-label={`${planName} onboarding plan page ${pageIndex + 1}`}>
      <div className="plan-frame">
        <div className="ph">
          <div className="ph-logo">
            <img src="/oakboard-logo.svg" alt="Oak Street Technologies" />
          </div>
          <div className="ph-right">
            <div className="ph-title">{planName} Onboarding Plan</div>
            <div className="ph-chips">
              <div className="ph-chip"><div className="ph-chip-lbl">Role</div><div className="ph-chip-val">{role || '—'}</div></div>
              <div className="ph-chip"><div className="ph-chip-lbl">Reports To</div><div className="ph-chip-val">{reports || '—'}</div></div>
              <div className="ph-chip"><div className="ph-chip-lbl">Collaborates With</div><div className="ph-chip-val">{collab || '—'}</div></div>
            </div>
          </div>
        </div>

        {pageWeeks.map((week, localWeekIndex) => {
          const weekNumber = pageIndex * 2 + localWeekIndex + 1
          return (
            <div className="week-block" key={weekNumber}>
              <div className="pw">
                <div className="pw-pill">Week {weekNumber} — {week.title || `Training Plan`}</div>
                {week.goal && <div className="pw-sub">{week.goal}</div>}
              </div>
              <div className="pd">
                {week.days.slice(0, 5).map((day) => (
                  <DayCard day={day} key={day.g || day.day} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function GenerateFormPage() {
  const plan = useMemo(() => readStoredPlan(), [])

  if (!plan) {
    return <Navigate to="/fill-details" replace />
  }

  const weeks =
    plan.weeks && plan.weeks.length > 0
      ? plan.weeks
      : [
          {
            title: 'Week 1 — Training Plan',
            days: (plan.days || []).slice(0, 5),
          },
          {
            title: 'Week 2 — Training Plan',
            days: (plan.days || []).slice(5, 10),
          },
        ]
  const nWeeks = Number(plan.nWeeks) === 4 ? 4 : 2
  const pageGroups = nWeeks === 4 ? [weeks.slice(0, 2), weeks.slice(2, 4)] : [weeks.slice(0, 2)]
  const role = plan.role || ''
  const reports = plan.reports || plan.reportsTo || ''
  const collab = plan.collab || plan.collaboratesWith || ''

  return (
    <main className="generate-page">
      <div className="tbr">
        <Link className="btn-tb" to="/fill-details">← Back to details</Link>
        <div className="tbr-r">
          <button className="btn-tb" onClick={() => window.print()} type="button">Print</button>
          <Link className="btn-tb pri" to="/fill-details">+ New Plan</Link>
        </div>
      </div>

      <div className="plan-wrap-react">
        {pageGroups.map((pageWeeks, pageIndex) => (
          <PlanPage
            collab={collab}
            key={pageIndex}
            nWeeks={nWeeks}
            pageIndex={pageIndex}
            pageWeeks={pageWeeks}
            reports={reports}
            role={role}
          />
        ))}
      </div>
    </main>
  )
}
