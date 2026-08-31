import holidayCalendar from '../../api/holiday-calendar.json'

type HolidayEntry = {
  name: string
  start: string
  end: string
  tentative: boolean
}

const holidays = holidayCalendar.holidays as HolidayEntry[]

export function toLocalDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function holidayForDate(date: Date) {
  const key = toLocalDateKey(date)
  return holidays.find((holiday) => key >= holiday.start && key <= holiday.end)
}

export function isNonWorkingDay(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6 || Boolean(holidayForDate(date))
}

export function nextWorkingDayIso(from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (isNonWorkingDay(date)) date.setDate(date.getDate() + 1)
  return toLocalDateKey(date)
}

export function workdays(startStr: string, count: number) {
  const dates: Date[] = []
  const date = parseLocalDate(startStr) || new Date()

  while (dates.length < count) {
    if (!isNonWorkingDay(date)) dates.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }

  return dates
}
