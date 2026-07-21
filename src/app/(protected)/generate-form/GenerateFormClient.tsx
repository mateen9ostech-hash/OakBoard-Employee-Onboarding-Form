'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { Button, Modal, PageToolbar, StatusBanner, TextField } from '@/components/ui'
import { invokeAuthenticatedFunction } from '@/lib/auth/client'
import { type PlanDay, type PlanWeek, readStoredPlan } from '@/types/plan'

const DAY_TITLE_MAX = 90
const DAY_TASK_MAX = 90
const DAY_TASK_SHORT_MAX = 50
const DAY_TASK_COUNT_LONG = 4
const DAY_TASK_COUNT_SHORT = 6
const DAY_OUTCOME_MAX = 90
const DEMO_RECIPIENT_EMAIL = 'mateen9ostech@gmail.com'

type EmailPayload = {
  to: string
  cc?: string
  subject: string
  html: string
  attachment: {
    filename: string
    content: string
  }
}

type EmailResult = {
  ok: boolean
  id?: string
  error?: string
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

function cleanDisplayWeekTitle(value: unknown) {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/^week\s+\d+\s*[:\-–—]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'Training Plan'
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
        <Image className="pdc-icon" src="/task-icon.svg" alt="" height={16} width={16} unoptimized />
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
            <Image src="/oakboard-logo.svg" alt="Oak Street Technologies" height={80} width={80} unoptimized />
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
                <div className="pw-pill">Week {weekNumber} — {cleanDisplayWeekTitle(week.title)}</div>
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

export default function GenerateFormClient() {
  const router = useRouter()
  const plan = useMemo(() => readStoredPlan(), [])
  const [exporting, setExporting] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState(DEMO_RECIPIENT_EMAIL)
  const [emailCc, setEmailCc] = useState('')
  const [emailNote, setEmailNote] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailNotice, setEmailNotice] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    if (!plan) router.replace('/fill-details')
  }, [plan, router])

  if (!plan) {
    return (
      <main className="auth-loader" aria-live="polite">
        <span className="auth-loader__spinner" aria-hidden="true" />
        <p>Loading plan...</p>
      </main>
    )
  }

  const weeks =
    plan.weeks && plan.weeks.length > 0
      ? plan.weeks
      : [
          {
            title: 'Training Plan',
            days: (plan.days || []).slice(0, 5),
          },
          {
            title: 'Training Plan',
            days: (plan.days || []).slice(5, 10),
          },
        ]
  const nWeeks = Number(plan.nWeeks) === 4 ? 4 : 2
  const pageGroups = nWeeks === 4 ? [weeks.slice(0, 2), weeks.slice(2, 4)] : [weeks.slice(0, 2)]
  const role = plan.role || ''
  const reports = plan.reports || plan.reportsTo || ''
  const collab = plan.collab || plan.collaboratesWith || ''
  const filename = `OakBoard-${nWeeks}-Week-Onboarding-Plan.pdf`

  async function buildPdfAttachment() {
    const pages = Array.from(document.querySelectorAll<HTMLElement>('.plan-doc-react'))
    if (pages.length === 0) throw new Error('No plan pages found.')

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080],
      hotfixes: ['px_scaling'],
    })

    for (const [index, page] of pages.entries()) {
      const dataUrl = await toPng(page, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1920,
        height: 1080,
        style: {
          margin: '0',
          transform: 'none',
          boxShadow: 'none',
        },
      })

      if (index > 0) pdf.addPage([1920, 1080], 'landscape')
      pdf.addImage(dataUrl, 'PNG', 0, 0, 1920, 1080, undefined, 'FAST')
    }

    const dataUri = pdf.output('datauristring')
    return {
      filename,
      content: dataUri.slice(dataUri.indexOf(',') + 1),
    }
  }

  async function downloadPdf() {
    setExporting(true)
    try {
      const attachment = await buildPdfAttachment()
      const binary = atob(attachment.content)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }

      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'PDF export failed.'
      window.alert(message)
    } finally {
      setExporting(false)
    }
  }

  function buildEmailHtml(note: string) {
    const planLabel = nWeeks === 4 ? 'Four-Week' : 'Two-Week'
    const noteBlock = note
      ? `<tr><td style="padding:16px 32px 0;"><div style="background:#f0fdf4;border-left:4px solid #24B34B;border-radius:4px;padding:12px 16px;font-size:14px;color:#354152;line-height:1.6;"><strong style="color:#01621C;">Note from sender:</strong><br>${escapeHtml(note)}</div></td></tr>`
      : ''

    const weekRows = weeks
      .slice(0, nWeeks)
      .map((week, weekIndex) => {
        const dayRows = week.days
          .slice(0, 5)
          .map((day) => {
            const tasks = limitTasks(day.tasks)
            const taskRows = tasks
              .map((task) => `<li style="font-size:12px;color:#495565;margin-bottom:4px;line-height:1.5;">${escapeHtml(task)}</li>`)
              .join('')
            return `
              <tr><td style="padding:10px 32px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e4e8e3;border-radius:10px;overflow:hidden;">
                  <tr><td style="background:#f8faf7;padding:8px 14px;border-bottom:1px solid #e4e8e3;">
                    <span style="background:#24B34B;color:white;font-size:11px;font-weight:600;padding:2px 9px;border-radius:6px;">Day ${day.g || day.day}</span>
                    ${day.date ? `<span style="font-size:11px;color:#697282;margin-left:8px;">${escapeHtml(formatDate(day.date))}</span>` : ''}
                  </td></tr>
                  <tr><td style="padding:12px 14px;">
                    <p style="font-size:13px;font-weight:600;color:#101727;margin:0 0 8px;">${escapeHtml(limitText(day.title, DAY_TITLE_MAX))}</p>
                    ${taskRows ? `<ul style="margin:0 0 8px;padding-left:18px;">${taskRows}</ul>` : ''}
                    ${day.outcome ? `<div style="background:#f0fdf4;border-radius:4px;padding:8px 10px;font-size:12px;color:#354152;line-height:1.5;">✓ ${escapeHtml(limitText(day.outcome, DAY_OUTCOME_MAX))}</div>` : ''}
                  </td></tr>
                </table>
              </td></tr>`
          })
          .join('')

        return `
          <tr><td style="padding:24px 32px 0;">
            <div style="background:#24B34B;color:white;font-weight:700;font-size:13px;padding:6px 14px;border-radius:4px;display:inline-block;letter-spacing:.3px;">
              Week ${weekIndex + 1} — ${escapeHtml(cleanDisplayWeekTitle(week.title))}
            </div>
            ${week.goal ? `<p style="font-size:13px;color:#697282;margin:6px 0 0;">${escapeHtml(week.goal)}</p>` : ''}
          </td></tr>
          ${dayRows}`
      })
      .join('')

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8faf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf7;padding:32px 0;">
<tr><td align="center"><table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;">
  <tr><td style="background:#24B34B;border-radius:12px 12px 0 0;padding:24px 32px;">
    <div style="color:white;font-size:22px;font-weight:800;">OakBoard</div>
    <div style="color:#dcfce7;font-size:13px;margin-top:4px;">Oak Street Technologies</div>
  </td></tr>
  <tr><td style="background:white;padding:26px 32px 8px;">
    <h1 style="font-size:22px;color:#101727;margin:0 0 16px;">${planLabel} Onboarding Plan</h1>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#f8faf7;border:1px solid #e4e8e3;border-radius:8px;padding:12px;"><div style="font-size:10px;color:#697282;text-transform:uppercase;font-weight:700;">Role</div><div style="font-size:14px;color:#101727;font-weight:700;margin-top:4px;">${escapeHtml(role || '—')}</div></td>
        <td width="10"></td>
        <td style="background:#f8faf7;border:1px solid #e4e8e3;border-radius:8px;padding:12px;"><div style="font-size:10px;color:#697282;text-transform:uppercase;font-weight:700;">Reports To</div><div style="font-size:14px;color:#101727;font-weight:700;margin-top:4px;">${escapeHtml(reports || '—')}</div></td>
        <td width="10"></td>
        <td style="background:#f8faf7;border:1px solid #e4e8e3;border-radius:8px;padding:12px;"><div style="font-size:10px;color:#697282;text-transform:uppercase;font-weight:700;">Collaborates With</div><div style="font-size:14px;color:#101727;font-weight:700;margin-top:4px;">${escapeHtml(collab || '—')}</div></td>
      </tr>
    </table>
  </td></tr>
  ${noteBlock}
  ${weekRows}
  <tr><td style="background:white;padding:24px 32px 32px;border-radius:0 0 12px 12px;">
    <p style="font-size:12px;color:#697282;line-height:1.5;margin:0;">A complete landscape PDF copy of this onboarding plan is attached.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`
  }

  function openEmailModal() {
    setEmailTo(DEMO_RECIPIENT_EMAIL)
    setEmailCc('')
    setEmailNote('')
    setEmailError('')
    setEmailNotice('')
    setEmailOpen(true)
  }

  async function sendEmail() {
    setEmailError('')
    setEmailNotice('')

    if (emailTo.trim().toLowerCase() !== DEMO_RECIPIENT_EMAIL) {
      setEmailError(`Demo Mode can only send to ${DEMO_RECIPIENT_EMAIL}.`)
      return
    }

    if (emailCc.trim()) {
      setEmailError('CC is unavailable in demo mode.')
      return
    }

    setSendingEmail(true)
    try {
      const attachment = await buildPdfAttachment()
      const payload: EmailPayload = {
        to: emailTo.trim(),
        subject: `${nWeeks}-Week Onboarding Plan: ${role || 'New Role'} — Oak Street Technologies`,
        html: buildEmailHtml(emailNote.trim()),
        attachment,
      }
      const result = await invokeAuthenticatedFunction<EmailPayload, EmailResult>('send-onboarding-email', payload)
      if (result.ok === false) throw new Error(result.error || 'Email was not sent.')
      setEmailNotice(`Plan sent to ${emailTo.trim()}.`)
      setEmailNote('')
      window.setTimeout(() => setEmailOpen(false), 900)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Failed to send. Please try again.'
      setEmailError(message)
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <main className="generate-page">
      <PageToolbar
        backLabel="Back to details"
        backTo="/fill-details"
        subtitle={`${role || 'New role'} / Preview & export`}
        title={`${nWeeks}-Week Onboarding Plan`}
        actions={(
          <>
            <Button icon="print" onClick={() => window.print()} type="button" variant="secondary">Print</Button>
            <Button icon="email" onClick={openEmailModal} type="button" variant="secondary">Send Email</Button>
            <Button disabled={exporting} icon="download" onClick={downloadPdf} type="button" variant="primary">
              {exporting ? 'Preparing PDF...' : 'Download PDF'}
            </Button>
            <Button icon="plus" to="/fill-details" variant="soft">New Plan</Button>
          </>
        )}
      />

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

      <Modal
        icon="email"
        onClose={() => setEmailOpen(false)}
        open={emailOpen}
        subtitle="Email a formatted copy and attached landscape PDF."
        title="Send Onboarding Plan"
        footer={(
          <>
            <Button disabled={sendingEmail} onClick={() => setEmailOpen(false)} type="button" variant="secondary">Cancel</Button>
            <Button disabled={sendingEmail} icon="email" onClick={sendEmail} type="button" variant="primary">
              {sendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </>
        )}
      >
        <div className="email-summary">
          <strong>Plan:</strong> {nWeeks}-Week Onboarding · {role || '—'}<br />
          <strong>From:</strong> onboarding@resend.dev<br />
          <strong>Includes:</strong> {nWeeks * 5} training days across {nWeeks} weeks
        </div>
        <StatusBanner tone="warning"><strong>Demo Mode:</strong> Resend test delivery is limited to the verified project-owner email.</StatusBanner>
        {emailError && <StatusBanner tone="error">{emailError}</StatusBanner>}
        {emailNotice && <StatusBanner tone="success">{emailNotice}</StatusBanner>}
        <TextField label="Recipient Email *" readOnly type="email" value={emailTo} onChange={(event) => setEmailTo(event.target.value)} />
        <TextField label="CC (Unavailable in demo mode)" disabled placeholder="Available after domain verification" type="email" value={emailCc} onChange={(event) => setEmailCc(event.target.value)} />
        <TextField label="Personal Note (Optional)" multiline placeholder="Add a short message to include with the plan..." value={emailNote} onChange={(event) => setEmailNote(event.target.value)} />
      </Modal>
    </main>
  )
}
