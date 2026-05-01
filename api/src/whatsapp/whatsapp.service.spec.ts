import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  WhatsappAutomation,
  WhatsappAutomationKind,
  WhatsappAutomationStatus,
  WhatsappConnection,
  WhatsappDispatchLog,
  WhatsappDispatchStatus,
  WhatsappSessionStatus
} from "@prisma/client"
import { PrismaService } from "../prisma/prisma.service"
import { WhatsappAdapter } from "./whatsapp.adapter"
import { WhatsappService } from "./whatsapp.service"

function makeConnection(overrides: Partial<WhatsappConnection> = {}): WhatsappConnection {
  return {
    id: "connection-1",
    key: "primary",
    label: "Canal",
    phoneNumber: null,
    groupName: "Grupo",
    groupJid: "120363000000000000@g.us",
    status: WhatsappSessionStatus.READY,
    qrCode: null,
    session: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastSeenAt: null,
    lastError: null,
    createdAt: new Date("2026-04-30T10:00:00.000Z"),
    updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    ...overrides
  }
}

function makeAutomation(overrides: Partial<WhatsappAutomation> = {}): WhatsappAutomation {
  return {
    id: "automation-1",
    connectionId: "connection-1",
    title: "Aviso",
    message: "Mensagem",
    kind: WhatsappAutomationKind.ONE_SHOT,
    status: WhatsappAutomationStatus.ACTIVE,
    targetGroupJid: null,
    scheduledFor: new Date("2026-04-30T10:05:00.000Z"),
    timeOfDay: null,
    daysOfWeek: [],
    dayOfMonth: null,
    monthDay: null,
    recurrenceTimeZone: "America/Sao_Paulo",
    lastRunAt: null,
    nextRunAt: new Date("2026-04-30T10:05:00.000Z"),
    lastStatus: null,
    lastError: null,
    createdAt: new Date("2026-04-30T10:00:00.000Z"),
    updatedAt: new Date("2026-04-30T10:00:00.000Z"),
    ...overrides
  }
}

function makeLog(overrides: Partial<WhatsappDispatchLog> = {}): WhatsappDispatchLog {
  return {
    id: "log-1",
    automationId: "automation-1",
    connectionId: "connection-1",
    dispatchKey: "automation-1:2026-04-30T10:05:00.000Z",
    targetGroupJid: "120363000000000000@g.us",
    message: "Mensagem",
    status: WhatsappDispatchStatus.SENT,
    attempts: 1,
    errorMessage: null,
    sentAt: new Date("2026-04-30T10:05:01.000Z"),
    scheduledFor: new Date("2026-04-30T10:05:00.000Z"),
    triggeredBy: "scheduler",
    metadata: null,
    createdAt: new Date("2026-04-30T10:05:00.000Z"),
    updatedAt: new Date("2026-04-30T10:05:01.000Z"),
    ...overrides
  }
}

function createService(prisma: unknown, adapter: unknown) {
  return new WhatsappService(prisma as PrismaService, adapter as WhatsappAdapter)
}

function getDispatch(service: WhatsappService) {
  return (service as unknown as {
    dispatchAutomation(automation: WhatsappAutomation, triggeredBy: string): Promise<unknown>
  }).dispatchAutomation.bind(service)
}

describe("WhatsappService", () => {
  it("nao processa automacoes quando o adapter ainda nao esta pronto", async () => {
    let findManyCalled = false
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      whatsappAutomation: {
        findMany: async () => {
          findManyCalled = true
          return []
        }
      }
    }
    const adapter = {
      isReady: () => false
    }
    const service = createService(prisma, adapter)

    await service.processDueAutomations()

    assert.equal(findManyCalled, false)
  })

  it("nao envia novamente quando ja existe log com a mesma chave de disparo", async () => {
    let sendCount = 0
    const existingLog = makeLog()
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      whatsappDispatchLog: {
        findUnique: async () => existingLog
      }
    }
    const adapter = {
      isReady: () => true,
      sendMessage: async () => {
        sendCount += 1
      }
    }
    const service = createService(prisma, adapter)
    const dispatchAutomation = getDispatch(service)

    const result = await dispatchAutomation(makeAutomation(), "scheduler")

    assert.equal(sendCount, 0)
    assert.deepEqual(result, {
      id: existingLog.id,
      automationId: existingLog.automationId,
      connectionId: existingLog.connectionId,
      dispatchKey: existingLog.dispatchKey,
      targetGroupJid: existingLog.targetGroupJid,
      message: existingLog.message,
      status: existingLog.status,
      attempts: existingLog.attempts,
      errorMessage: existingLog.errorMessage,
      sentAt: existingLog.sentAt?.toISOString() ?? null,
      scheduledFor: existingLog.scheduledFor?.toISOString() ?? null,
      triggeredBy: existingLog.triggeredBy,
      metadata: null,
      createdAt: existingLog.createdAt.toISOString(),
      updatedAt: existingLog.updatedAt.toISOString()
    })
  })

  it("registra retry e falha final quando o envio falha duas vezes", async () => {
    const logUpdates: Array<{ status?: WhatsappDispatchStatus; attempts?: number; errorMessage?: string | null }> = []
    const automationUpdates: Array<{
      lastStatus?: WhatsappDispatchStatus | null
      lastError?: string | null
      nextRunAt?: Date | null
    }> = []
    const automation = makeAutomation()
    const createdLog = makeLog({
      status: WhatsappDispatchStatus.PENDING,
      sentAt: null,
      attempts: 1,
      errorMessage: null
    })
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      whatsappDispatchLog: {
        findUnique: async () => null,
        create: async () => createdLog,
        update: async ({ data }: { data: Partial<WhatsappDispatchLog> }) => {
          logUpdates.push({
            status: data.status,
            attempts: data.attempts,
            errorMessage: data.errorMessage
          })
          return makeLog({ ...createdLog, ...data })
        }
      },
      whatsappAutomation: {
        update: async ({ data }: { data: Partial<WhatsappAutomation> }) => {
          automationUpdates.push({
            lastStatus: data.lastStatus,
            lastError: data.lastError,
            nextRunAt: data.nextRunAt
          })
          return makeAutomation({ ...automation, ...data })
        }
      }
    }
    const adapter = {
      isReady: () => true,
      sendMessage: async () => {
        throw new Error("Falha de envio")
      }
    }
    const service = createService(prisma, adapter)
    const dispatchAutomation = getDispatch(service)

    await dispatchAutomation(automation, "scheduler")

    assert.equal(logUpdates[0].status, WhatsappDispatchStatus.RETRYING)
    assert.equal(logUpdates[0].attempts, 2)
    assert.equal(logUpdates[1].status, WhatsappDispatchStatus.FAILED)
    assert.equal(logUpdates[1].attempts, 2)
    assert.equal(automationUpdates[0].lastStatus, WhatsappDispatchStatus.FAILED)
    assert.equal(automationUpdates[0].lastError, "Falha de envio")
    assert.equal(automationUpdates[0].nextRunAt, null)
  })
})
