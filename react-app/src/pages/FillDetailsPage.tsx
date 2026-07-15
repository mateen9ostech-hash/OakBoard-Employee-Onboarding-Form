import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { invokeAuthenticatedFunction, signOut } from '../lib/auth'
import { type OnboardingPlan, type PlanWeek, writeStoredPlan } from '../types/plan'

const DPW = 5
const DAY_TITLE_MAX = 90
const DAY_TASK_MAX = 90
const DAY_TASK_SHORT_MAX = 50
const DAY_TASK_COUNT_LONG = 4
const DAY_TASK_COUNT_SHORT = 6
const DAY_OUTCOME_MAX = 90

type ImportPayload = {
  sourceType: string
  rawText: string
  preferredWeeks?: number
  sourceFilename?: string | null
}

type ImportResult = {
  provider?: string
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
  const [importSource, setImportSource] = useState('email_text')
  const [importWeeks, setImportWeeks] = useState('auto')
  const [importText, setImportText] = useState('')
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<{ type: 'info' | 'error'; message: string } | null>(null)
  const [importing, setImporting] = useState(false)

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

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function collect(): OnboardingPlan {
    const planDates = workdays(startDate, nWeeks * DPW)
    const normalizedWeeks = weeks.slice(0, nWeeks).map((week, wi) => ({
      ...week,
      title: week.title || `Week ${wi + 1} — Training Plan`,
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
    navigate('/generate-form')
  }

  function applyImportedPlan(plan: ImportResult['plan']) {
    const importedWeeks = Number(plan.nWeeks) === 4 ? 4 : 2
    setDuration(importedWeeks)
    setRole(limitText(plan.role, 80))
    setReports(limitText(plan.reports, 120))
    setCollab(limitText(plan.collab, 160))
    const nextWeeks = makeWeeks(importedWeeks)
    plan.weeks.slice(0, importedWeeks).forEach((week, wi) => {
      nextWeeks[wi].title = limitText(week.title, 90)
      nextWeeks[wi].goal = limitText(week.goal, 140)
      ;(week.days || []).slice(0, DPW).forEach((day, di) => {
        nextWeeks[wi].days[di] = {
          ...nextWeeks[wi].days[di],
          title: limitText(day.title, DAY_TITLE_MAX),
          tasks: limitTasks(day.tasks),
          outcome: limitText(day.outcome, DAY_OUTCOME_MAX),
        }
      })
    })
    setWeeks(nextWeeks)
    setOpenWeeks(new Set(Array.from({ length: importedWeeks }, (_, index) => index)))
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      if (!text.trim()) throw new Error('This file does not contain readable text.')
      setImportText(text.slice(0, 120000))
      setImportFileName(file.name)
      setImportSource(file.name.toLowerCase().endsWith('.eml') ? 'email_text' : 'manual_text')
      setImportStatus({ type: 'info', message: `${file.name} loaded. Review the text, then parse it.` })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The selected file could not be read.'
      setImportStatus({ type: 'error', message })
    }
  }

  async function parseImportedPlan() {
    const rawText = importText.trim()
    if (rawText.length < 40) {
      setImportStatus({ type: 'error', message: 'Please paste enough source content to build a useful plan.' })
      return
    }

    setImporting(true)
    setImportStatus({ type: 'info', message: 'Structuring the content into OakBoard weeks and days...' })
    try {
      const result = await invokeAuthenticatedFunction<ImportPayload, ImportResult>('parse-onboarding-plan', {
        sourceType: importSource,
        rawText,
        preferredWeeks: importWeeks === 'auto' ? undefined : Number(importWeeks),
        sourceFilename: importFileName,
      })
      applyImportedPlan(result.plan)
      setImportOpen(false)
      setNotice(`Imported successfully using ${result.provider || 'the configured parser'}. Please review before generating.`)
      setError('')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The plan could not be imported.'
      setImportStatus({ type: 'error', message })
    } finally {
      setImporting(false)
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
          <button className="btn-tb" onClick={handleSignOut} type="button">Sign out</button>
        </div>
      </header>

      <form className="fo" onSubmit={handleSubmit}>
        <div className="fi">
          <h1>Create Onboarding Plan</h1>
          <p>Fill in role details and expand each day to add topic, tasks and outcome. The PDF output matches your exact template design.</p>
        </div>

        <section className="sec">
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

        <section className="sec">
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

        <section className="sec">
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
          <button className="btn-reset" onClick={resetAll} type="button">Reset</button>
          <button className="btn-tb sample" onClick={fillDemoData} type="button">Fill Sample Plan</button>
          <button className="btn-tb" onClick={() => setImportOpen(true)} type="button">Import with AI</button>
          <button className="btn-gen" type="submit">Generate Plan</button>
        </div>
      </form>

      {importOpen && (
        <div className="import-overlay on" onClick={(event) => event.target === event.currentTarget && setImportOpen(false)}>
          <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="import-head">
              <div><h2 id="import-title">Import onboarding plan</h2><p>Paste an email, PDF-extracted text, or onboarding notes. OakBoard will structure it into the current form.</p></div>
              <button className="import-close" onClick={() => setImportOpen(false)} type="button">×</button>
            </div>
            <div className="import-body">
              <div className="import-grid">
                <div className="import-field"><label>Content type</label><select onChange={(event) => setImportSource(event.target.value)} value={importSource}><option value="email_text">Email text</option><option value="pdf_text">PDF text</option><option value="notebooklm_text">NotebookLM text</option><option value="manual_text">Other notes</option></select></div>
                <div className="import-field"><label>Plan duration</label><select onChange={(event) => setImportWeeks(event.target.value)} value={importWeeks}><option value="auto">Detect automatically</option><option value="2">2 weeks</option><option value="4">4 weeks</option></select></div>
              </div>
              <div className="import-field"><label>Optional text or email file</label><input className="import-file" accept=".txt,.eml,text/plain,message/rfc822" onChange={handleImportFile} type="file" /><span className="import-help">For a PDF, copy its text and paste it below.</span></div>
              <div className="import-field"><label>Source content *</label><textarea onChange={(event) => setImportText(event.target.value)} placeholder="Paste the complete email, PDF text, or onboarding notes here..." value={importText} /></div>
              {importStatus && <div className={`import-status on ${importStatus.type}`}>{importStatus.message}</div>}
            </div>
            <div className="import-actions">
              <button className="import-cancel" onClick={() => setImportOpen(false)} type="button">Cancel</button>
              <button className="import-submit" disabled={importing} onClick={parseImportedPlan} type="button">{importing ? 'Parsing...' : 'Parse & Fill Form'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
