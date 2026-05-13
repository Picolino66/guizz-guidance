import type {
  WhatsappAutomation,
  WhatsappAutomationStatus,
  WhatsappConnection,
  WhatsappDispatchLog
} from "../../lib/whatsapp-api"

export const whatsappStatusLabels: Record<WhatsappConnection["status"], string> = {
  DISCONNECTED: "Desconectado",
  CONNECTING: "Conectando",
  QR_REQUIRED: "QR necessário",
  READY: "Conectado",
  ERROR: "Erro"
}

export const whatsappAutomationKindLabels: Record<WhatsappAutomation["kind"], string> = {
  ONE_SHOT: "Aviso único",
  REMINDER: "Lembrete",
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  BIRTHDAY: "Aniversário"
}

export const whatsappAutomationStatusLabels: Record<WhatsappAutomationStatus, string> = {
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ARCHIVED: "Arquivada"
}

export const whatsappDispatchStatusLabels: Record<WhatsappDispatchLog["status"], string> = {
  PENDING: "Pendente",
  RETRYING: "Tentando novamente",
  SENT: "Enviado",
  FAILED: "Falhou",
  SKIPPED: "Ignorado"
}

export function formatWhatsappTriggerLabel(triggeredBy: string) {
  switch (triggeredBy) {
    case "manual":
      return "manual"
    case "scheduler":
      return "agendador"
    case "manual-test":
      return "teste manual"
    default:
      return triggeredBy
  }
}
