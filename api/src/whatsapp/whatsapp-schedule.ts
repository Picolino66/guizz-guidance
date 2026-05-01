import { WhatsappAutomationKind } from "@prisma/client"

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
  reference = new Date()
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
    return buildNextDailyRun(reference, hours, minutes)
  }

  if (kind === WhatsappAutomationKind.WEEKLY) {
    return buildNextWeeklyRun(reference, hours, minutes, input.daysOfWeek ?? [])
  }

  if (kind === WhatsappAutomationKind.MONTHLY) {
    return buildNextMonthlyRun(reference, hours, minutes, input.dayOfMonth ?? 1)
  }

  return buildNextYearlyRun(reference, hours, minutes, input.monthDay ?? "01-01")
}

export function buildNextDailyRun(reference: Date, hours: number, minutes: number) {
  const candidate = withTime(reference, hours, minutes)
  if (candidate.getTime() <= reference.getTime()) {
    candidate.setDate(candidate.getDate() + 1)
  }

  return candidate
}

export function buildNextWeeklyRun(reference: Date, hours: number, minutes: number, daysOfWeek: number[]) {
  if (daysOfWeek.length === 0) {
    return buildNextDailyRun(reference, hours, minutes)
  }

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(reference)
    candidate.setDate(candidate.getDate() + offset)
    candidate.setHours(hours, minutes, 0, 0)

    if (daysOfWeek.includes(candidate.getDay()) && candidate.getTime() > reference.getTime()) {
      return candidate
    }
  }

  const fallback = withTime(reference, hours, minutes)
  fallback.setDate(fallback.getDate() + 7)
  return fallback
}

export function buildNextMonthlyRun(reference: Date, hours: number, minutes: number, dayOfMonth: number) {
  const candidate = new Date(reference)
  candidate.setHours(hours, minutes, 0, 0)
  candidate.setDate(Math.min(dayOfMonth, getLastDayOfMonth(candidate.getFullYear(), candidate.getMonth())))

  if (candidate.getTime() <= reference.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1)
    candidate.setDate(Math.min(dayOfMonth, getLastDayOfMonth(candidate.getFullYear(), candidate.getMonth())))
  }

  return candidate
}

export function buildNextYearlyRun(reference: Date, hours: number, minutes: number, monthDay: string) {
  const [month, day] = monthDay.split("-").map((value) => Number(value))
  const candidate = new Date(reference)
  candidate.setMonth(Math.max(month - 1, 0))
  candidate.setDate(day)
  candidate.setHours(hours, minutes, 0, 0)

  if (candidate.getTime() <= reference.getTime()) {
    candidate.setFullYear(candidate.getFullYear() + 1)
  }

  return candidate
}

function withTime(reference: Date, hours: number, minutes: number) {
  const candidate = new Date(reference)
  candidate.setHours(hours, minutes, 0, 0)
  return candidate
}

function parseTimeOfDay(timeOfDay: string) {
  const [hours, minutes] = timeOfDay.split(":").map((value) => Number(value))
  return [Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0]
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}
