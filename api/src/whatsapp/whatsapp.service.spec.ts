import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BadRequestException } from "@nestjs/common"
import {
  Contact,
  WhatsappAutomation,
  WhatsappAutomationKind,
  WhatsappAutomationStatus,
  WhatsappAutomationTargetType,
  WhatsappConnection,
  WhatsappDispatchLog,
  WhatsappDispatchStatus,
  WhatsappGroup,
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
    targetType: WhatsappAutomationTargetType.GROUP,
    targetJid: "120363000000000000@g.us",
    imageBase64: null,
    imageMimeType: null,
    imageFileName: null,
    mentionJids: [],
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
    targetType: WhatsappAutomationTargetType.GROUP,
    targetJid: "120363000000000000@g.us",
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

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    name: "Maria Silva",
    email: "maria@guidance.dev",
    phoneNumber: "5511999999999",
    searchText: "maria silva maria@guidance.dev 5511999999999",
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
    updatedAt: new Date("2026-05-12T10:00:00.000Z"),
    ...overrides
  }
}

function makeGroup(overrides: Partial<WhatsappGroup> = {}): WhatsappGroup {
  return {
    id: "group-1",
    connectionId: "connection-1",
    jid: "120363000000000000@g.us",
    name: "Gestão",
    searchText: "gestao 120363000000000000@g.us",
    isAvailable: true,
    lastSyncedAt: new Date("2026-05-12T10:00:00.000Z"),
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
    updatedAt: new Date("2026-05-12T10:00:00.000Z"),
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
  it("rejeita criacao de automacao sem destino explicito", async () => {
    let createCalled = false
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      whatsappAutomation: {
        create: async () => {
          createCalled = true
          return makeAutomation()
        }
      }
    }
    const service = createService(prisma, {})
    const payload = {
      title: "Sem destino",
      message: "Mensagem",
      kind: WhatsappAutomationKind.ONE_SHOT,
      scheduledFor: "2026-04-30T10:05:00.000Z"
    } as Parameters<WhatsappService["createAutomation"]>[0]

    await assert.rejects(
      service.createAutomation(payload),
      BadRequestException
    )

    assert.equal(createCalled, false)
  })

  it("rejeita JID incompatível com o tipo de destino", async () => {
    let createCalled = false
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      whatsappAutomation: {
        create: async () => {
          createCalled = true
          return makeAutomation()
        }
      }
    }
    const service = createService(prisma, {})

    await assert.rejects(
      service.createAutomation({
        title: "Destino inválido",
        message: "Mensagem",
        kind: WhatsappAutomationKind.ONE_SHOT,
        targetType: WhatsappAutomationTargetType.CONTACT,
        targetJid: "120363000000000000@g.us",
        scheduledFor: "2026-04-30T10:05:00.000Z"
      }),
      BadRequestException
    )

    assert.equal(createCalled, false)
  })

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
      targetType: existingLog.targetType,
      targetJid: existingLog.targetJid,
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

  it("envia automacao com imagem e mencoes sem persistir base64 no log", async () => {
    let sentPayload: unknown = null
    let createdLogData: Partial<WhatsappDispatchLog> & { metadata?: unknown } = {}
    const automation = makeAutomation({
      imageBase64: Buffer.from("imagem").toString("base64"),
      imageMimeType: "image/png",
      imageFileName: "foto.png",
      mentionJids: ["5511999999999@s.whatsapp.net"]
    })
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
        create: async ({ data }: { data: Partial<WhatsappDispatchLog> & { metadata?: unknown } }) => {
          createdLogData = data
          return makeLog({ ...createdLog, ...data })
        },
        update: async ({ data }: { data: Partial<WhatsappDispatchLog> }) => makeLog({ ...createdLog, ...data })
      },
      whatsappAutomation: {
        update: async ({ data }: { data: Partial<WhatsappAutomation> }) => makeAutomation({ ...automation, ...data })
      }
    }
    const adapter = {
      isReady: () => true,
      sendMessage: async (_jid: string, payload: unknown) => {
        sentPayload = payload
      }
    }
    const service = createService(prisma, adapter)
    const dispatchAutomation = getDispatch(service)

    await dispatchAutomation(automation, "scheduler")

    assert.deepEqual(createdLogData.metadata, {
      hasImage: true,
      imageMimeType: "image/png",
      imageFileName: "foto.png",
      mentionJids: ["5511999999999@s.whatsapp.net"]
    })
    assert.equal(JSON.stringify(createdLogData.metadata).includes(automation.imageBase64 ?? ""), false)
    assert.deepEqual(sentPayload, {
      text: "Mensagem\n\n@5511999999999",
      image: {
        buffer: Buffer.from("imagem"),
        mimeType: "image/png",
        fileName: "foto.png"
      },
      mentions: ["5511999999999@s.whatsapp.net"]
    })
  })

  it("extrai mencoes escritas no corpo da mensagem", async () => {
    let sentPayload: unknown = null
    const automation = makeAutomation({
      message: "Bom dia @5511999999999"
    })
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
        create: async ({ data }: { data: Partial<WhatsappDispatchLog> & { metadata?: unknown } }) => makeLog({ ...createdLog, ...data }),
        update: async ({ data }: { data: Partial<WhatsappDispatchLog> }) => makeLog({ ...createdLog, ...data })
      },
      whatsappAutomation: {
        update: async ({ data }: { data: Partial<WhatsappAutomation> }) => makeAutomation({ ...automation, ...data })
      }
    }
    const adapter = {
      isReady: () => true,
      sendMessage: async (_jid: string, payload: unknown) => {
        sentPayload = payload
      }
    }
    const service = createService(prisma, adapter)
    const dispatchAutomation = getDispatch(service)

    await dispatchAutomation(automation, "scheduler")

    assert.deepEqual(sentPayload, {
      text: "Bom dia @5511999999999",
      image: null,
      mentions: ["5511999999999@s.whatsapp.net"]
    })
  })

  it("lista participantes do grupo informado para autocomplete", async () => {
    const adapter = {
      isReady: () => true,
      getGroupParticipants: async () => [
        {
          jid: "5511999999999@s.whatsapp.net",
          name: "Maria Silva",
          phoneNumber: "5511999999999",
          isAdmin: false
        }
      ]
    }
    const service = createService({}, adapter)

    const result = await service.listGroupParticipants("120363000000000000@g.us")

    assert.deepEqual(result, [
      {
        jid: "5511999999999@s.whatsapp.net",
        name: "Maria Silva",
        phoneNumber: "5511999999999",
        mentionText: "@Maria Silva",
        isAdmin: false
      }
    ])
  })

  it("lista grupos persistidos com busca normalizada", async () => {
    let receivedWhere: unknown = null
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      whatsappGroup: {
        findMany: async ({ where }: { where: unknown }) => {
          receivedWhere = where
          return [makeGroup()]
        }
      }
    }
    const service = createService(prisma, {})

    const result = await service.listGroups("GESTÃO")

    assert.deepEqual(receivedWhere, {
      connectionId: "connection-1",
      isAvailable: true,
      searchText: {
        contains: "gestao"
      }
    })
    assert.deepEqual(result, [
      {
        jid: "120363000000000000@g.us",
        name: "Gestão"
      }
    ])
  })

  it("lista contatos da agenda em formato whatsapp", async () => {
    const prisma = {
      contact: {
        findMany: async () => [
          makeContact(),
          makeContact({
            id: "contact-2",
            name: null,
            email: null,
            phoneNumber: "5511888888888",
            searchText: "5511888888888"
          })
        ]
      }
    }
    const service = createService(prisma, {})

    const result = await service.listContacts("maria")

    assert.deepEqual(result, [
      {
        jid: "5511999999999@s.whatsapp.net",
        name: "Maria Silva",
        phoneNumber: "5511999999999"
      },
      {
        jid: "5511888888888@s.whatsapp.net",
        name: "5511888888888",
        phoneNumber: "5511888888888"
      }
    ])
  })

  it("sincroniza grupos e marca os ausentes como indisponiveis", async () => {
    let syncCalled = 0
    const updateManyCalls: Array<{ where: unknown; data: unknown }> = []
    const upsertCalls: Array<{ where: unknown; create: unknown; update: unknown }> = []
    const prisma = {
      whatsappConnection: {
        upsert: async () => makeConnection()
      },
      contact: {
        count: async () => 2
      },
      whatsappGroup: {
        count: async () => 1
      },
      $transaction: async (callback: (tx: unknown) => Promise<void>) =>
        callback({
          whatsappGroup: {
            updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
              updateManyCalls.push({ where, data })
            },
            upsert: async ({ where, create, update }: { where: unknown; create: unknown; update: unknown }) => {
              upsertCalls.push({ where, create, update })
            }
          }
        })
    }
    const adapter = {
      isReady: () => true,
      syncDirectory: async () => {
        syncCalled += 1
        return { contactCount: 0, groupCount: 0 }
      },
      getGroups: async () => [
        {
          jid: "120363000000000001@g.us",
          name: "Engenharia"
        }
      ]
    }
    const service = createService(prisma, adapter)

    const result = await service.syncDirectory()

    assert.equal(syncCalled, 1)
    assert.deepEqual(updateManyCalls, [
      {
        where: {
          connectionId: "connection-1",
          jid: {
            notIn: ["120363000000000001@g.us"]
          }
        },
        data: {
          isAvailable: false
        }
      }
    ])
    assert.equal(upsertCalls.length, 1)
    assert.deepEqual(upsertCalls[0]?.where, {
      connectionId_jid: {
        connectionId: "connection-1",
        jid: "120363000000000001@g.us"
      }
    })
    assert.deepEqual(result, {
      contactCount: 2,
      groupCount: 1
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
