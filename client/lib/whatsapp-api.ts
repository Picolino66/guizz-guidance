import { apiFetch } from "./api"
import { getAdminToken } from "./session"

export type WhatsappSessionStatus = "DISCONNECTED" | "CONNECTING" | "QR_REQUIRED" | "READY" | "ERROR"
export type WhatsappAutomationKind = "ONE_SHOT" | "REMINDER" | "DAILY" | "WEEKLY" | "MONTHLY" | "BIRTHDAY"
export type WhatsappAutomationStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"
export type WhatsappDispatchStatus = "PENDING" | "RETRYING" | "SENT" | "FAILED" | "SKIPPED"

export interface WhatsappConnection {
  id: string
  key: string
  label: string
  phoneNumber: string | null
  groupName: string | null
  groupJid: string | null
  status: WhatsappSessionStatus
  qrCode: string | null
  lastConnectedAt: string | null
  lastDisconnectedAt: string | null
  lastSeenAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface WhatsappAutomation {
  id: string
  connectionId: string
  title: string
  message: string
  kind: WhatsappAutomationKind
  status: WhatsappAutomationStatus
  targetGroupJid: string | null
  scheduledFor: string | null
  timeOfDay: string | null
  daysOfWeek: number[]
  dayOfMonth: number | null
  monthDay: string | null
  recurrenceTimeZone: string
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: WhatsappDispatchStatus | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface WhatsappDispatchLog {
  id: string
  automationId: string | null
  connectionId: string
  dispatchKey: string
  targetGroupJid: string
  message: string
  status: WhatsappDispatchStatus
  attempts: number
  errorMessage: string | null
  sentAt: string | null
  scheduledFor: string | null
  triggeredBy: string
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export interface WhatsappOverview {
  connection: WhatsappConnection
  stats: {
    activeAutomations: number
    pendingAutomations: number
    totalAutomations: number
    totalLogs: number
    sentLogs: number
    failedLogs: number
  }
  recentLogs: WhatsappDispatchLog[]
  dueAutomations: WhatsappAutomation[]
}

export interface WhatsappGroup {
  jid: string
  name: string
}

export async function whatsappFetch<T>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(path, options, getAdminToken() ?? undefined)
}
