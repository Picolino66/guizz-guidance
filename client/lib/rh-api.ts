import { API_BASE_URL, ApiError } from "./api"
import { getRhToken } from "./rh-session"

export async function rhFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getRhToken()
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: "no-store" })

  if (!res.ok) {
    const raw = await res.text()
    let message = raw || "Erro na requisição."
    try {
      const payload = JSON.parse(raw)
      if (payload && typeof payload === "object" && "message" in payload) message = payload.message
    } catch {}
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type InterviewStatus =
  | "DRAFT" | "SCHEDULING" | "WAITING_TECH_CONFIRMATION"
  | "WAITING_RH_APPROVAL" | "SCHEDULED" | "DONE" | "EVALUATED" | "CLOSED"

export type SlotStatus = "PROPOSED" | "CONFIRMED" | "REJECTED"
export type FormQuestionType = "YES_NO" | "TEXT" | "TEXTAREA" | "SINGLE_CHOICE" | "NUMBER"
export type InterviewDecision = "APPROVED" | "REJECTED" | "HOLD"
export type SystemRole = "ADMIN" | "USER"

export interface RhUserSummary { id: string; name: string; role: SystemRole }

export interface Candidate {
  id: string; name: string; linkedinUrl?: string; pretensaoSenioridade?: string
  cidadeEstado: string; formacao: string; resumoProfissional: string
  ferramentas: string; motivacaoMudanca: string; createdAt: string
}

export interface JobPosition {
  id: string; titulo: string; nivel: string; descricao?: string; stackTags: string[]
}

export interface InterviewSlot {
  id: string; startAt: string; endAt?: string; status: SlotStatus
  createdBy: { id: string; name: string }
}

export interface FormQuestion {
  id: string; label: string; type: FormQuestionType; required: boolean; options: string[]; order: number
}

export interface FormTemplate { id: string; name: string; version: number; isLocked: boolean; questions: FormQuestion[] }

export interface Interview {
  id: string; status: InterviewStatus; finalDecision?: InterviewDecision
  candidate: Candidate; jobPosition: JobPosition
  assignees: Array<{ user: RhUserSummary }>
  slots: InterviewSlot[]; confirmedSlot?: InterviewSlot
  formTemplate?: FormTemplate
  submission?: { id: string; answers: any[] }
  auditLogs: Array<{ id: string; action: string; createdAt: string; actor?: { name: string } }>
  createdAt: string; updatedAt: string
}

// ─── Helpers de status ───────────────────────────────────────────────────────

export const STATUS_LABELS: Record<InterviewStatus, string> = {
  DRAFT: "Rascunho", SCHEDULING: "Agendando", WAITING_TECH_CONFIRMATION: "Aguardando Confirmação",
  WAITING_RH_APPROVAL: "Aguardando RH", SCHEDULED: "Agendada", DONE: "Realizada",
  EVALUATED: "Avaliada", CLOSED: "Encerrada"
}

export const STATUS_COLORS: Record<InterviewStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600", SCHEDULING: "bg-blue-100 text-blue-700",
  WAITING_TECH_CONFIRMATION: "bg-yellow-100 text-yellow-700", WAITING_RH_APPROVAL: "bg-orange-100 text-orange-700",
  SCHEDULED: "bg-emerald-100 text-emerald-700", DONE: "bg-purple-100 text-purple-700",
  EVALUATED: "bg-indigo-100 text-indigo-700", CLOSED: "bg-gray-200 text-gray-500"
}

export const DECISION_LABELS: Record<InterviewDecision, string> = {
  APPROVED: "Aprovado", REJECTED: "Reprovado", HOLD: "Em espera"
}

export const DECISION_COLORS: Record<InterviewDecision, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700", REJECTED: "bg-red-100 text-red-700", HOLD: "bg-yellow-100 text-yellow-700"
}
