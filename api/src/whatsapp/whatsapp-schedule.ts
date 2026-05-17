import { WhatsappAutomationKind } from "@prisma/client"

const DEFAULT_TIME_ZONE = "America/Sao_Paulo"

export interface WhatsappScheduleInput {
  scheduledFor?: string | Date | null
  timeOfDay?: string | null
  daysOfWeek?: number[] | null
  dayOfMonth?: number | null
  monthDay?: string | null
}

export function resolveWhatsappNextRunAt(
  kind: WhatsappAutomationKind,
  input: WhatsappScheduleInput,
  reference = new Date(),
  timeZone = DEFAULT_TIME_ZONE
) {
  if (kind === WhatsappAutomationKind.ONE_SHOT || kind === WhatsappAutomationKind.REMINDER) {
    if (!input.scheduledFor) {
      return null
    }

    const scheduledFor = input.scheduledFor instanceof Date ? input.scheduledFor : new Date(input.scheduledFor)
    return Number.isNaN(scheduledFor.getTime()) ? null : scheduledFor
  }

  const [hours, minutes] = parseTimeOfDay(input.timeOfDay ?? "09:00")

  if (kind === WhatsappAutomationKind.DAILY) {
    return buildNextDailyRun(reference, hours, minutes, timeZone)
  }

  if (kind === WhatsappAutomationKind.WEEKLY) {
    return buildNextWeeklyRun(reference, hours, minutes, input.daysOfWeek ?? [], timeZone)
  }

  if (kind === WhatsappAutomationKind.MONTHLY) {
    return buildNextMonthlyRun(reference, hours, minutes, input.dayOfMonth ?? 1, timeZone)
  }

  return buildNextYearlyRun(reference, hours, minutes, input.monthDay ?? "01-01", timeZone)
}

export function buildNextDailyRun(reference: Date, hours: number, minutes: number, timeZone: string) {
  const { year, month, day } = getYMDInZone(reference, timeZone)
  const candidate = buildDateInTimeZone(year, month, day, hours, minutes, timeZone)

  if (candidate.getTime() <= reference.getTime()) {
    return buildDateInTimeZone(year, month, day + 1, hours, minutes, timeZone)
  }

  return candidate
}

export function buildNextWeeklyRun(
  reference: Date,
  hours: number,
  minutes: number,
  daysOfWeek: number[],
  timeZone: string
) {
  if (daysOfWeek.length === 0) {
    return buildNextDailyRun(reference, hours, minutes, timeZone)
  }

  for (let offset = 0; offset < 14; offset++) {
    const probe = new Date(reference.getTime() + offset * 24 * 60 * 60 * 1000)

    if (daysOfWeek.includes(getDayOfWeekInZone(probe, timeZone))) {
      const candidate = withTimeInZone(probe, hours, minutes, timeZone)

      if (candidate.getTime() > reference.getTime()) {
        return candidate
      }
    }
  }

  const { year, month, day } = getYMDInZone(reference, timeZone)
  return buildDateInTimeZone(year, month, day + 7, hours, minutes, timeZone)
}

export function buildNextMonthlyRun(reference: Date, hours: number, minutes: number, dayOfMonth: number, timeZone: string) {
  const { year, month } = getYMDInZone(reference, timeZone)
  const clampedDay = Math.min(dayOfMonth, getLastDayOfMonth(year, month - 1))
  const candidate = buildDateInTimeZone(year, month, clampedDay, hours, minutes, timeZone)

  if (candidate.getTime() <= reference.getTime()) {
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const nextClampedDay = Math.min(dayOfMonth, getLastDayOfMonth(nextYear, nextMonth - 1))
    return buildDateInTimeZone(nextYear, nextMonth, nextClampedDay, hours, minutes, timeZone)
  }

  return candidate
}

export function buildNextYearlyRun(reference: Date, hours: number, minutes: number, monthDay: string, timeZone: string) {
  const [month, day] = monthDay.split("-").map((value) => Number(value))
  const { year } = getYMDInZone(reference, timeZone)
  const candidate = buildDateInTimeZone(year, Math.max(month, 1), day, hours, minutes, timeZone)

  if (candidate.getTime() <= reference.getTime()) {
    return buildDateInTimeZone(year + 1, Math.max(month, 1), day, hours, minutes, timeZone)
  }

  return candidate
}

// Builds a UTC Date representing the given wall-clock time in the specified IANA timezone.
// Uses an offset-correction trick: approximate in UTC, measure the resulting local offset, correct once.
function buildDateInTimeZone(year: number, month: number, day: number, hours: number, minutes: number, timeZone: string): Date {
  const utcApprox = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
  const offsetMs = getUtcOffsetMs(utcApprox, timeZone)
  return new Date(utcApprox.getTime() - offsetMs)
}

function withTimeInZone(reference: Date, hours: number, minutes: number, timeZone: string): Date {
  const { year, month, day } = getYMDInZone(reference, timeZone)
  return buildDateInTimeZone(year, month, day, hours, minutes, timeZone)
}

// Returns the calendar date (Y/M/D) of a UTC instant as seen in the given IANA timezone.
function getYMDInZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const [datePart] = date.toLocaleString("sv-SE", { timeZone }).split(" ")
  const [year, month, day] = (datePart as string).split("-").map(Number)
  return { year, month, day }
}

// Returns the day of week (0=Sun … 6=Sat) of a UTC instant as seen in the given IANA timezone.
function getDayOfWeekInZone(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[weekday] ?? 0
}

// Returns the UTC offset in milliseconds for a given instant in the given timezone.
// Positive = timezone is ahead of UTC (east), negative = behind (west).
function getUtcOffsetMs(date: Date, timeZone: string): number {
  const localStr = date.toLocaleString("sv-SE", { timeZone })
  const localDate = new Date(`${localStr.replace(" ", "T")}Z`)
  return localDate.getTime() - date.getTime()
}

function parseTimeOfDay(timeOfDay: string): [number, number] {
  const [hours, minutes] = timeOfDay.split(":").map((value) => Number(value))
  return [Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0]
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}
