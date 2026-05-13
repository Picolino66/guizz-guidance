import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit
} from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import {
  Contact,
  Prisma,
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
import { buildSearchText, normalizeSearchTextPart } from "../common/utils/search-text"
import { PrismaService } from "../prisma/prisma.service"
import { CreateWhatsappAutomationDto } from "./dto/create-whatsapp-automation.dto"
import { ListWhatsappLogsDto } from "./dto/list-whatsapp-logs.dto"
import { SendWhatsappMessageDto } from "./dto/send-whatsapp-message.dto"
import { UpdateWhatsappAutomationDto } from "./dto/update-whatsapp-automation.dto"
import { UpdateWhatsappConnectionDto } from "./dto/update-whatsapp-connection.dto"
import {
  type WhatsappDirectorySyncResult,
  type WhatsappGroupParticipant,
  type WhatsappOutboundMessage,
  WhatsappAdapter
} from "./whatsapp.adapter"
import { WhatsappGateway } from "./whatsapp.gateway"
import { resolveWhatsappNextRunAt, type WhatsappScheduleInput } from "./whatsapp-schedule"

const DEFAULT_CONNECTION_LABEL = "Canal WhatsApp Guidance"
const DEFAULT_TIME_ZONE = "America/Sao_Paulo"
const WHATSAPP_GROUP_JID_PATTERN = /^[\w.-]+@g\.us$/
const WHATSAPP_CONTACT_JID_PATTERN = /^(?:\d+@s\.whatsapp\.net|[\w.-]+@lid)$/
const MAX_WHATSAPP_IMAGE_BYTES = 5 * 1024 * 1024
const WHATSAPP_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const WHATSAPP_IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i
const WHATSAPP_VISUAL_MENTION_PATTERN = /(?:^|[^\w])@(\d{8,15})(?!\w)/g
const WHATSAPP_ANY_VISUAL_MENTION_PATTERN = /(?:^|[^\w])@[^\s@]+/
const WHATSAPP_CONTACT_NAME_PLACEHOLDER_PATTERN = /\[nome\]/gi
const WHATSAPP_DIRECTORY_SEARCH_LIMIT = 20

interface WhatsappRichMessageInput {
  message?: string | null
  imageBase64?: string | null
  imageMimeType?: string | null
  imageFileName?: string | null
  mentionNumbers?: string[] | null
  mentionJids?: string[] | null
}

interface WhatsappRichMessagePayload {
  message: string
  imageBase64: string | null
  imageMimeType: string | null
  imageFileName: string | null
  mentionJids: string[]
}

interface WhatsappAutomationTargetInput {
  type: WhatsappAutomationTargetType
  primaryJid: string
  jids: string[]
}

export interface WhatsappConnectionView {
  id: string
  key: string
  label: string
  phoneNumber: string | null
  status: WhatsappSessionStatus
  qrCode: string | null
  lastConnectedAt: string | null
  lastDisconnectedAt: string | null
  lastSeenAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface WhatsappAutomationView {
  id: string
  connectionId: string
  title: string
  message: string
  kind: WhatsappAutomationKind
  status: WhatsappAutomationStatus
  targetType: WhatsappAutomationTargetType | null
  targetJid: string | null
  targetJids: string[]
  imageBase64: string | null
  imageMimeType: string | null
  imageFileName: string | null
  mentionJids: string[]
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

export interface WhatsappDispatchLogView {
  id: string
  automationId: string | null
  automationTitle: string | null
  connectionId: string
  dispatchKey: string
  targetType: WhatsappAutomationTargetType
  targetJid: string
  targetName: string
  message: string
  status: WhatsappDispatchStatus
  attempts: number
  errorMessage: string | null
  sentAt: string | null
  scheduledFor: string | null
  triggeredBy: string
  metadata: Prisma.JsonValue | null
  createdAt: string
  updatedAt: string
}

export interface WhatsappDispatchLogsPageView {
  items: WhatsappDispatchLogView[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

export interface WhatsappGroupParticipantView {
  jid: string
  name: string
  phoneNumber: string
  mentionText: string
  isAdmin: boolean
}

export interface WhatsappContactView {
  jid: string
  name: string
  phoneNumber: string
}

export interface WhatsappGroupView {
  jid: string
  name: string
}

export interface WhatsappDirectorySyncView extends WhatsappDirectorySyncResult {}

@Injectable()
export class WhatsappService implements OnModuleInit {
  private schedulerRunning = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapter: WhatsappAdapter,
    private readonly gateway?: WhatsappGateway
  ) {}

  async onModuleInit() {
    const connection = await this.ensurePrimaryConnection()
    if (connection.session) {
      const updated = await this.prisma.whatsappConnection.update({
        where: { id: connection.id },
        data: {
          status: WhatsappSessionStatus.CONNECTING,
          qrCode: null,
          lastError: null
        }
      })
      await this.startAdapter(updated)
      return
    }

    if (
      connection.status === WhatsappSessionStatus.CONNECTING ||
      connection.status === WhatsappSessionStatus.QR_REQUIRED ||
      connection.status === WhatsappSessionStatus.READY
    ) {
      const updated = await this.prisma.whatsappConnection.update({
        where: { id: connection.id },
        data: {
          status: WhatsappSessionStatus.DISCONNECTED,
          qrCode: null,
          lastDisconnectedAt: new Date()
        }
      })
      this.publishConnection(updated)
    }
  }

  async getOverview() {
    const connection = await this.ensurePrimaryConnection()
    const [activeAutomations, pendingAutomations, totalAutomations, totalLogs, groupedLogs, recentLogs, dueAutomations] =
      await Promise.all([
        this.prisma.whatsappAutomation.count({
          where: { connectionId: connection.id, status: WhatsappAutomationStatus.ACTIVE }
        }),
        this.prisma.whatsappAutomation.count({
          where: {
            connectionId: connection.id,
            status: WhatsappAutomationStatus.ACTIVE,
            nextRunAt: { lte: new Date() }
          }
        }),
        this.prisma.whatsappAutomation.count({
          where: { connectionId: connection.id }
        }),
        this.prisma.whatsappDispatchLog.count({
          where: { connectionId: connection.id }
        }),
        this.prisma.whatsappDispatchLog.groupBy({
          by: ["status"],
          where: { connectionId: connection.id },
          _count: { _all: true }
        }),
        this.prisma.whatsappDispatchLog.findMany({
          where: { connectionId: connection.id },
          orderBy: { createdAt: "desc" },
          take: 5
        }),
        this.prisma.whatsappAutomation.findMany({
          where: {
            connectionId: connection.id,
            status: WhatsappAutomationStatus.ACTIVE,
            nextRunAt: { lte: new Date() }
          },
          orderBy: { nextRunAt: "asc" },
          take: 5
        })
      ])

    return {
      connection: this.toConnectionView(connection),
      stats: {
        activeAutomations,
        pendingAutomations,
        totalAutomations,
        totalLogs,
        sentLogs: groupedLogs.find((item) => item.status === WhatsappDispatchStatus.SENT)?._count._all ?? 0,
        failedLogs: groupedLogs.find((item) => item.status === WhatsappDispatchStatus.FAILED)?._count._all ?? 0
      },
      recentLogs: recentLogs.map((log) => this.toLogView(log)),
      dueAutomations: dueAutomations.map((automation) => this.toAutomationView(automation))
    }
  }

  async getConnection() {
    return this.toConnectionView(await this.ensurePrimaryConnection())
  }

  async updateConnection(dto: UpdateWhatsappConnectionDto) {
    const connection = await this.ensurePrimaryConnection()

    const updated = await this.prisma.whatsappConnection.update({
      where: { id: connection.id },
      data: {
        label: dto.label?.trim() || connection.label,
        phoneNumber: this.normalizeOptionalString(dto.phoneNumber)
      }
    })

    this.publishConnection(updated)
    return this.toConnectionView(updated)
  }

  async connect() {
    const connection = await this.ensurePrimaryConnection()
    const updated = await this.prisma.whatsappConnection.update({
      where: { id: connection.id },
      data: {
        status: WhatsappSessionStatus.CONNECTING,
        qrCode: null,
        lastError: null
      }
    })
    this.publishConnection(updated)

    await this.startAdapter(updated)

    return this.getConnection()
  }

  async disconnect() {
    const connection = await this.ensurePrimaryConnection()
    await this.adapter.disconnect()

    const updated = await this.prisma.whatsappConnection.update({
      where: { id: connection.id },
      data: {
        status: WhatsappSessionStatus.DISCONNECTED,
        qrCode: null,
        session: Prisma.DbNull,
        lastDisconnectedAt: new Date()
      }
    })

    this.publishConnection(updated)
    return this.toConnectionView(updated)
  }

  async listAutomations() {
    const connection = await this.ensurePrimaryConnection()
    const rows = await this.prisma.whatsappAutomation.findMany({
      where: { connectionId: connection.id },
      orderBy: [{ status: "asc" }, { nextRunAt: "asc" }, { createdAt: "desc" }]
    })

    return rows.map((automation) => this.toAutomationView(automation))
  }

  async listLogs(query: ListWhatsappLogsDto) {
    const connection = await this.ensurePrimaryConnection()
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const where = {
      connectionId: connection.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.automationId ? { automationId: query.automationId } : {})
    }
    const [total, rows] = await Promise.all([
      this.prisma.whatsappDispatchLog.count({ where }),
      this.prisma.whatsappDispatchLog.findMany({
        where,
        include: {
          automation: {
            select: {
              title: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ])
    const groupJids = new Set<string>()
    const contactPhoneNumbers = new Set<string>()

    for (const row of rows) {
      if (row.targetType === WhatsappAutomationTargetType.GROUP) {
        groupJids.add(row.targetJid)
        continue
      }

      const phoneNumber = this.extractPhoneNumberFromContactJid(row.targetJid)

      if (phoneNumber) {
        contactPhoneNumbers.add(phoneNumber)
      }
    }

    const [groups, contacts] = await Promise.all([
      groupJids.size > 0
        ? this.prisma.whatsappGroup.findMany({
            where: {
              connectionId: connection.id,
              jid: {
                in: [...groupJids]
              }
            },
            select: {
              jid: true,
              name: true
            }
          })
        : Promise.resolve([]),
      contactPhoneNumbers.size > 0
        ? this.prisma.contact.findMany({
            where: {
              phoneNumber: {
                in: [...contactPhoneNumbers]
              }
            },
            select: {
              phoneNumber: true,
              name: true
            }
          })
        : Promise.resolve([])
    ])
    const groupNameByJid = new Map(groups.map((group) => [group.jid, group.name.trim() || "Grupo sem nome"]))
    const contactNameByPhoneNumber = new Map(
      contacts.map((contact) => [contact.phoneNumber ?? "", contact.name?.trim() || contact.phoneNumber || "Contato sem nome"])
    )
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

    return {
      items: rows.map((log) =>
        this.toLogView(log, {
          automationTitle: log.automation?.title?.trim() || null,
          targetName:
            log.targetType === WhatsappAutomationTargetType.GROUP
              ? groupNameByJid.get(log.targetJid) ?? "Grupo não encontrado"
              : contactNameByPhoneNumber.get(this.extractPhoneNumberFromContactJid(log.targetJid) ?? "") ?? "Contato não encontrado"
        })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages
      }
    }
  }

  async createAutomation(dto: CreateWhatsappAutomationDto) {
    const connection = await this.ensurePrimaryConnection()
    this.validateAutomationSchedule(dto.kind, dto)
    const target = this.resolveTargetInput(dto.targetType, dto.targetJid, dto.targetJids)
    const richMessage = this.normalizeRichMessagePayload(dto)
    const nextRunAt = this.resolveNextRunAt(dto.kind, dto)

    const row = await this.prisma.whatsappAutomation.create({
      data: {
        connectionId: connection.id,
        title: dto.title.trim(),
        message: richMessage.message,
        kind: dto.kind,
        status: dto.status ?? WhatsappAutomationStatus.ACTIVE,
        targetType: target.type,
        targetJid: target.primaryJid,
        targetJids: target.jids,
        imageBase64: richMessage.imageBase64,
        imageMimeType: richMessage.imageMimeType,
        imageFileName: richMessage.imageFileName,
        mentionJids: richMessage.mentionJids,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        timeOfDay: this.normalizeOptionalString(dto.timeOfDay),
        daysOfWeek: dto.daysOfWeek ?? [],
        dayOfMonth: dto.dayOfMonth ?? null,
        monthDay: this.normalizeOptionalString(dto.monthDay),
        recurrenceTimeZone: dto.recurrenceTimeZone?.trim() || DEFAULT_TIME_ZONE,
        nextRunAt
      }
    })

    return this.toAutomationView(row)
  }

  async updateAutomation(id: string, dto: UpdateWhatsappAutomationDto) {
    const existing = await this.ensureAutomation(id)
    const kind = dto.kind ?? existing.kind
    const target = this.resolveTargetInput(
      dto.targetType ?? existing.targetType,
      dto.targetJid ?? existing.targetJid,
      dto.targetJids ?? existing.targetJids
    )
    const runtimeInput = {
      scheduledFor: dto.scheduledFor ?? existing.scheduledFor?.toISOString() ?? null,
      timeOfDay: dto.timeOfDay ?? existing.timeOfDay,
      daysOfWeek: dto.daysOfWeek ?? existing.daysOfWeek,
      dayOfMonth: dto.dayOfMonth ?? existing.dayOfMonth,
      monthDay: dto.monthDay ?? existing.monthDay
    }
    this.validateAutomationSchedule(kind, runtimeInput)
    const richMessage =
      dto.message !== undefined ||
      dto.imageBase64 !== undefined ||
      dto.imageMimeType !== undefined ||
      dto.imageFileName !== undefined ||
      dto.mentionNumbers !== undefined
        ? this.normalizeRichMessagePayload({
            message: dto.message ?? existing.message,
            imageBase64: dto.imageBase64 ?? existing.imageBase64,
            imageMimeType: dto.imageMimeType ?? existing.imageMimeType,
            imageFileName: dto.imageFileName ?? existing.imageFileName,
            mentionNumbers: dto.mentionNumbers,
            mentionJids: dto.mentionNumbers === undefined ? existing.mentionJids : undefined
          })
        : null
    const nextRunAt = this.resolveNextRunAt(kind, runtimeInput)

    const row = await this.prisma.whatsappAutomation.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        message: richMessage?.message,
        kind: dto.kind,
        status: dto.status,
        targetType: dto.targetType === undefined ? undefined : target.type,
        targetJid:
          dto.targetType === undefined && dto.targetJid === undefined && dto.targetJids === undefined
            ? undefined
            : target.primaryJid,
        targetJids:
          dto.targetType === undefined && dto.targetJid === undefined && dto.targetJids === undefined
            ? undefined
            : target.jids,
        imageBase64: richMessage ? richMessage.imageBase64 : undefined,
        imageMimeType: richMessage ? richMessage.imageMimeType : undefined,
        imageFileName: richMessage ? richMessage.imageFileName : undefined,
        mentionJids: richMessage ? richMessage.mentionJids : undefined,
        scheduledFor: dto.scheduledFor === undefined ? undefined : dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        timeOfDay: dto.timeOfDay === undefined ? undefined : this.normalizeOptionalString(dto.timeOfDay),
        daysOfWeek: dto.daysOfWeek ?? undefined,
        dayOfMonth: dto.dayOfMonth ?? undefined,
        monthDay: dto.monthDay === undefined ? undefined : this.normalizeOptionalString(dto.monthDay),
        recurrenceTimeZone: dto.recurrenceTimeZone?.trim(),
        nextRunAt,
        lastError: null
      }
    })

    return this.toAutomationView(row)
  }

  async toggleAutomation(id: string) {
    const existing = await this.ensureAutomation(id)

    if (existing.status === WhatsappAutomationStatus.ARCHIVED) {
      throw new BadRequestException("Automações arquivadas não podem ser reativadas.")
    }

    const nextStatus =
      existing.status === WhatsappAutomationStatus.ACTIVE
        ? WhatsappAutomationStatus.PAUSED
        : WhatsappAutomationStatus.ACTIVE

    const row = await this.prisma.whatsappAutomation.update({
      where: { id },
      data: {
        status: nextStatus,
        nextRunAt: nextStatus === WhatsappAutomationStatus.ACTIVE ? this.resolveNextRunAt(existing.kind, existing) : null
      }
    })

    return this.toAutomationView(row)
  }

  async removeAutomation(id: string) {
    await this.ensureAutomation(id)
    await this.prisma.whatsappAutomation.delete({ where: { id } })
    return { success: true }
  }

  async runAutomationNow(id: string) {
    const automation = await this.ensureAutomation(id)
    return this.dispatchAutomation(automation, "manual")
  }

  async sendTestMessage(dto: SendWhatsappMessageDto) {
    const connection = await this.ensurePrimaryConnection()
    const target = this.resolveTargetInput(dto.targetType, dto.targetJid)
    const richMessage = this.normalizeRichMessagePayload(dto)
    const metadata = this.buildDispatchMetadata(richMessage)
    const dispatchKey = `manual:${connection.id}:${Date.now()}`
    const log = await this.prisma.whatsappDispatchLog.create({
      data: {
        connectionId: connection.id,
        dispatchKey,
        targetType: target.type,
        targetJid: target.primaryJid,
        message: richMessage.message,
        status: WhatsappDispatchStatus.PENDING,
        attempts: 1,
        triggeredBy: "manual-test",
        metadata
      }
    })

    try {
      await this.sendMessage(target.primaryJid, richMessage)
      const row = await this.prisma.whatsappDispatchLog.update({
        where: { id: log.id },
        data: {
          status: WhatsappDispatchStatus.SENT,
          sentAt: new Date()
        }
      })

      return this.toLogView(row)
    } catch (error) {
      const row = await this.prisma.whatsappDispatchLog.update({
        where: { id: log.id },
        data: {
          status: WhatsappDispatchStatus.FAILED,
          errorMessage: this.getErrorMessage(error)
        }
      })

      return this.toLogView(row)
    }
  }

  async listGroups(search?: string) {
    const connection = await this.ensurePrimaryConnection()
    const rows = await this.prisma.whatsappGroup.findMany({
      where: {
        connectionId: connection.id,
        isAvailable: true,
        ...this.buildDirectorySearchWhere(search)
      },
      orderBy: [{ name: "asc" }, { jid: "asc" }],
      take: WHATSAPP_DIRECTORY_SEARCH_LIMIT
    })

    return rows.map((group) => this.toGroupView(group))
  }

  async listContacts(search?: string) {
    const rows = await this.prisma.contact.findMany({
      where: {
        phoneNumber: {
          not: null
        },
        ...this.buildDirectorySearchWhere(search)
      },
      orderBy: [{ name: "asc" }, { email: "asc" }, { phoneNumber: "asc" }],
      take: WHATSAPP_DIRECTORY_SEARCH_LIMIT
    })

    return rows.map((contact) => this.toContactView(contact))
  }

  async syncDirectory(): Promise<WhatsappDirectorySyncView> {
    if (!this.adapter.isReady()) {
      throw new BadRequestException("WhatsApp não está conectado. Conecte-se antes de sincronizar.")
    }

    const connection = await this.ensurePrimaryConnection()
    await this.adapter.syncDirectory()

    const now = new Date()
    const groups = await this.adapter.getGroups()
    const groupJids = groups.map((group) => group.jid)

    await this.prisma.$transaction(async (tx) => {
      await tx.whatsappGroup.updateMany({
        where: {
          connectionId: connection.id,
          ...(groupJids.length > 0
            ? {
                jid: {
                  notIn: groupJids
                }
              }
            : {})
        },
        data: {
          isAvailable: false
        }
      })

      for (const group of groups) {
        await tx.whatsappGroup.upsert({
          where: {
            connectionId_jid: {
              connectionId: connection.id,
              jid: group.jid
            }
          },
          create: {
            connectionId: connection.id,
            jid: group.jid,
            name: group.name,
            searchText: this.buildGroupSearchText(group.name, group.jid),
            isAvailable: true,
            lastSyncedAt: now
          },
          update: {
            name: group.name,
            searchText: this.buildGroupSearchText(group.name, group.jid),
            isAvailable: true,
            lastSyncedAt: now
          }
        })
      }
    })

    const [contactCount, groupCount] = await Promise.all([
      this.prisma.contact.count({
        where: {
          phoneNumber: {
            not: null
          }
        }
      }),
      this.prisma.whatsappGroup.count({
        where: {
          connectionId: connection.id,
          isAvailable: true
        }
      })
    ])

    return {
      contactCount,
      groupCount
    }
  }

  async listGroupParticipants(groupJid?: string) {
    if (!this.adapter.isReady()) {
      throw new BadRequestException("WhatsApp não está conectado. Conecte-se antes de listar os participantes.")
    }

    const normalizedGroupJid = this.normalizeOptionalString(groupJid)
    this.validateGroupJid(normalizedGroupJid)

    if (!normalizedGroupJid) {
      throw new BadRequestException("Informe o grupo alvo antes de buscar participantes.")
    }

    return (await this.adapter.getGroupParticipants(normalizedGroupJid)).map((participant) =>
      this.toGroupParticipantView(participant)
    )
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueAutomations() {
    if (this.schedulerRunning) {
      return
    }

    this.schedulerRunning = true

    try {
      const connection = await this.ensurePrimaryConnection()
      if (connection.status !== WhatsappSessionStatus.READY || !this.adapter.isReady()) {
        return
      }

      const dueAutomations = await this.prisma.whatsappAutomation.findMany({
        where: {
          connectionId: connection.id,
          status: WhatsappAutomationStatus.ACTIVE,
          nextRunAt: { lte: new Date() }
        },
        orderBy: { nextRunAt: "asc" },
        take: 20
      })

      for (const automation of dueAutomations) {
        await this.dispatchAutomation(automation, "scheduler")
      }
    } finally {
      this.schedulerRunning = false
    }
  }

  private async dispatchAutomation(automation: WhatsappAutomation, triggeredBy: string) {
    const connection = await this.ensurePrimaryConnection()
    const targetJids = this.getAutomationTargetJids(automation)

    if (!automation.targetType || targetJids.length === 0) {
      const row = await this.prisma.whatsappDispatchLog.create({
        data: {
          automationId: automation.id,
          connectionId: connection.id,
          dispatchKey: `${automation.id}:${Date.now()}:missing-target`,
          targetType: WhatsappAutomationTargetType.GROUP,
          targetJid: "nao-configurado",
          message: automation.message,
          status: WhatsappDispatchStatus.SKIPPED,
          attempts: 0,
          errorMessage: "Automação sem destino configurado.",
          triggeredBy,
          metadata: Prisma.JsonNull
        }
      })

      await this.prisma.whatsappAutomation.update({
        where: { id: automation.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: WhatsappDispatchStatus.SKIPPED,
          lastError: "Automação sem destino configurado."
        }
      })

      return this.toLogView(row)
    }

    const scheduledFor = automation.nextRunAt ?? new Date()

    const results = []
    for (const targetJid of targetJids) {
      results.push(await this.dispatchAutomationToTarget(automation, connection.id, scheduledFor, triggeredBy, targetJid))
    }

    if (results.every((item) => !item.wasCreatedFromDispatch)) {
      if (results.length === 1) {
        return this.toLogView(results[0].log)
      }

      return {
        logs: results.map((item) => this.toLogView(item.log))
      }
    }

    const statuses = results.map((item) => item.log.status)
    const failedResults = results.filter((item) => item.log.status === WhatsappDispatchStatus.FAILED)
    const skippedResults = results.filter((item) => item.log.status === WhatsappDispatchStatus.SKIPPED)
    const lastStatus = failedResults.length > 0
      ? WhatsappDispatchStatus.FAILED
      : statuses.every((status) => status === WhatsappDispatchStatus.SKIPPED)
        ? WhatsappDispatchStatus.SKIPPED
        : WhatsappDispatchStatus.SENT
    const lastError = failedResults.length > 0
      ? failedResults.map((item) => item.log.errorMessage).filter(Boolean).join(" | ")
      : skippedResults.length === results.length
        ? skippedResults.map((item) => item.log.errorMessage).filter(Boolean).join(" | ")
        : null

    const updatedAutomation = await this.prisma.whatsappAutomation.update({
      where: { id: automation.id },
      data: {
        lastRunAt: new Date(),
        lastStatus,
        lastError,
        nextRunAt: this.getNextAutomationRunAt(automation, scheduledFor)
      }
    })

    if (results.length === 1) {
      const [result] = results

      if (!result.wasCreatedFromDispatch) {
        return this.toLogView(result.log)
      }

      return {
        automation: this.toAutomationView(updatedAutomation),
        log: this.toLogView(result.log)
      }
    }

    return {
      automation: this.toAutomationView(updatedAutomation),
      logs: results.map((item) => this.toLogView(item.log))
    }
  }

  private async sendMessage(targetJid: string, payload: WhatsappRichMessagePayload) {
    if (!this.adapter.isReady()) {
      throw new BadRequestException("A conexão WhatsApp ainda não está pronta.")
    }

    await this.adapter.sendMessage(targetJid, this.toOutboundMessage(payload))
  }

  private async dispatchAutomationToTarget(
    automation: WhatsappAutomation,
    connectionId: string,
    scheduledFor: Date,
    triggeredBy: string,
    targetJid: string
  ) {
    const richMessage = await this.resolveAutomationMessagePayload(automation, targetJid)
    const metadata = this.buildDispatchMetadata(richMessage)
    const dispatchKey = `${automation.id}:${scheduledFor.toISOString()}:${targetJid}`
    const existingLog = await this.prisma.whatsappDispatchLog.findUnique({
      where: { dispatchKey }
    })

    if (existingLog) {
      return {
        log: existingLog,
        wasCreatedFromDispatch: false
      }
    }

    const log = await this.prisma.whatsappDispatchLog.create({
      data: {
        automationId: automation.id,
        connectionId,
        dispatchKey,
        targetType: automation.targetType ?? WhatsappAutomationTargetType.CONTACT,
        targetJid,
        message: richMessage.message,
        status: WhatsappDispatchStatus.PENDING,
        attempts: 1,
        scheduledFor,
        triggeredBy,
        metadata
      }
    })

    try {
      await this.sendMessage(targetJid, richMessage)
      return {
        log: await this.prisma.whatsappDispatchLog.update({
          where: { id: log.id },
          data: {
            status: WhatsappDispatchStatus.SENT,
            sentAt: new Date()
          }
        }),
        wasCreatedFromDispatch: true
      }
    } catch (error) {
      const retryError = this.getErrorMessage(error)

      await this.prisma.whatsappDispatchLog.update({
        where: { id: log.id },
        data: {
          status: WhatsappDispatchStatus.RETRYING,
          attempts: 2,
          errorMessage: retryError
        }
      })

      try {
        await this.sendMessage(targetJid, richMessage)
        return {
          log: await this.prisma.whatsappDispatchLog.update({
            where: { id: log.id },
            data: {
              status: WhatsappDispatchStatus.SENT,
              sentAt: new Date(),
              attempts: 2,
              errorMessage: null
            }
          }),
          wasCreatedFromDispatch: true
        }
      } catch (retryErrorValue) {
        return {
          log: await this.prisma.whatsappDispatchLog.update({
            where: { id: log.id },
            data: {
              status: WhatsappDispatchStatus.FAILED,
              attempts: 2,
              errorMessage: this.getErrorMessage(retryErrorValue)
            }
          }),
          wasCreatedFromDispatch: true
        }
      }
    }
  }

  private async resolveAutomationMessagePayload(automation: WhatsappAutomation, targetJid: string) {
    return this.normalizeRichMessagePayload({
      message: await this.resolveAutomationMessage(automation, targetJid),
      imageBase64: automation.imageBase64,
      imageMimeType: automation.imageMimeType,
      imageFileName: automation.imageFileName,
      mentionJids: automation.mentionJids
    })
  }

  private async resolveAutomationMessage(automation: WhatsappAutomation, targetJid: string) {
    if (
      automation.targetType !== WhatsappAutomationTargetType.CONTACT ||
      !automation.message.toLowerCase().includes("[nome]")
    ) {
      return automation.message
    }

    const phoneNumber = this.extractPhoneNumberFromContactJid(targetJid)

    if (!phoneNumber) {
      throw new BadRequestException("Não foi possível identificar o telefone do contato da automação.")
    }

    const contact = await this.prisma.contact.findUnique({
      where: {
        phoneNumber
      }
    })

    if (!contact) {
      throw new NotFoundException("Contato da automação não encontrado na agenda interna.")
    }

    const contactName = contact.name?.trim() || phoneNumber

    return automation.message.replaceAll(WHATSAPP_CONTACT_NAME_PLACEHOLDER_PATTERN, contactName)
  }

  private normalizeRichMessagePayload(input: WhatsappRichMessageInput): WhatsappRichMessagePayload {
    const message = input.message?.trim()

    if (!message) {
      throw new BadRequestException("Informe a mensagem do envio.")
    }

    const visualMentionNumbers = this.extractVisualMentionNumbers(message)
    const mentionJids = this.normalizeMentionJids([
      ...visualMentionNumbers,
      ...(input.mentionNumbers ?? []),
      ...(input.mentionJids ?? [])
    ])
    const image = this.normalizeImagePayload(input)

    return {
      message: this.withVisualMentions(message, mentionJids),
      imageBase64: image?.base64 ?? null,
      imageMimeType: image?.mimeType ?? null,
      imageFileName: image?.fileName ?? null,
      mentionJids
    }
  }

  private normalizeImagePayload(input: WhatsappRichMessageInput) {
    const rawImage = input.imageBase64?.trim()

    if (!rawImage) {
      return null
    }

    const dataUrlMatch = rawImage.match(WHATSAPP_IMAGE_DATA_URL_PATTERN)
    const dataUrlMimeType = dataUrlMatch?.[1]?.toLowerCase()
    const base64 = (dataUrlMatch?.[2] ?? rawImage).replace(/\s/g, "")
    const mimeType = (input.imageMimeType?.trim().toLowerCase() || dataUrlMimeType) ?? null

    if (!mimeType || !WHATSAPP_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException("A imagem deve ser JPEG, PNG ou WebP.")
    }

    if (dataUrlMimeType && dataUrlMimeType !== mimeType) {
      throw new BadRequestException("O MIME type da imagem não confere com o Base64 informado.")
    }

    if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(base64)) {
      throw new BadRequestException("Informe uma imagem em Base64 válido.")
    }

    const buffer = Buffer.from(base64, "base64")
    const normalizedBase64 = buffer.toString("base64").replace(/=+$/, "")

    if (buffer.byteLength === 0 || normalizedBase64 !== base64.replace(/=+$/, "")) {
      throw new BadRequestException("Informe uma imagem em Base64 válido.")
    }

    if (buffer.byteLength > MAX_WHATSAPP_IMAGE_BYTES) {
      throw new BadRequestException("A imagem deve ter no máximo 5 MB.")
    }

    return {
      base64,
      mimeType,
      fileName: this.normalizeOptionalString(input.imageFileName)
    }
  }

  private normalizeMentionJids(values: string[]) {
    const mentionJids = new Set<string>()

    for (const value of values) {
      const normalized = this.normalizeMentionJid(value)
      if (normalized) {
        mentionJids.add(normalized)
      }
    }

    return [...mentionJids]
  }

  private extractVisualMentionNumbers(message: string) {
    return [...message.matchAll(WHATSAPP_VISUAL_MENTION_PATTERN)].map((match) => match[1])
  }

  private normalizeMentionJid(value: string) {
    const normalized = value.trim().toLowerCase()

    if (!normalized) {
      return null
    }

    if (WHATSAPP_CONTACT_JID_PATTERN.test(normalized)) {
      return normalized
    }

    const digits = normalized.replace(/\D/g, "")

    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException("Informe telefones de menção com DDD/DDI ou JIDs @s.whatsapp.net válidos.")
    }

    return `${digits}@s.whatsapp.net`
  }

  private withVisualMentions(message: string, mentionJids: string[]) {
    if (WHATSAPP_ANY_VISUAL_MENTION_PATTERN.test(message)) {
      return message
    }

    const missingMentions = mentionJids
      .map((jid) => `@${jid.split("@")[0]}`)
      .filter((mention) => !message.includes(mention))

    if (missingMentions.length === 0) {
      return message
    }

    return `${message}\n\n${missingMentions.join(" ")}`
  }

  private toOutboundMessage(payload: WhatsappRichMessagePayload): WhatsappOutboundMessage {
    const image = payload.imageBase64
      ? {
          buffer: Buffer.from(payload.imageBase64, "base64"),
          mimeType: payload.imageMimeType ?? "image/jpeg",
          fileName: payload.imageFileName
        }
      : null

    return {
      text: payload.message,
      image,
      mentions: payload.mentionJids
    }
  }

  private buildDispatchMetadata(payload: WhatsappRichMessagePayload): Prisma.InputJsonObject | undefined {
    if (!payload.imageBase64 && payload.mentionJids.length === 0) {
      return undefined
    }

    return {
      hasImage: Boolean(payload.imageBase64),
      imageMimeType: payload.imageMimeType,
      imageFileName: payload.imageFileName,
      mentionJids: payload.mentionJids
    }
  }

  private async startAdapter(connection: WhatsappConnection) {
    await this.adapter.connect(connection.session, {
      onQr: async (qr) => {
        const updated = await this.prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status: WhatsappSessionStatus.QR_REQUIRED,
            qrCode: qr,
            lastSeenAt: new Date(),
            lastError: null
          }
        })
        this.publishConnection(updated)
      },
      onReady: async () => {
        const updated = await this.prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status: WhatsappSessionStatus.READY,
            qrCode: null,
            lastConnectedAt: new Date(),
            lastSeenAt: new Date(),
            lastError: null
          }
        })
        this.publishConnection(updated)
      },
      onLoggedOut: async (reason) => {
        const updated = await this.prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status: WhatsappSessionStatus.DISCONNECTED,
            qrCode: null,
            session: Prisma.DbNull,
            lastDisconnectedAt: new Date(),
            lastError: reason
          }
        })
        this.publishConnection(updated)
      },
      onReconnecting: async (reason) => {
        const updated = await this.prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status: WhatsappSessionStatus.CONNECTING,
            qrCode: null,
            lastDisconnectedAt: new Date(),
            lastError: reason
          }
        })
        this.publishConnection(updated)
      },
      onDisconnected: async (reason) => {
        const updated = await this.prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            status: WhatsappSessionStatus.ERROR,
            qrCode: null,
            lastDisconnectedAt: new Date(),
            lastError: reason
          }
        })
        this.publishConnection(updated)
      },
      onSession: async (session) => {
        await this.prisma.whatsappConnection.update({
          where: { id: connection.id },
          data: {
            session: session === null ? Prisma.DbNull : (session as Prisma.InputJsonValue)
          }
        })
      }
    })
  }

  private publishConnection(connection: WhatsappConnection) {
    this.gateway?.emitSessionUpdated(this.toConnectionView(connection))
  }

  private async ensurePrimaryConnection() {
    return this.prisma.whatsappConnection.upsert({
      where: { key: "primary" },
      update: {},
      create: {
        key: "primary",
        label: DEFAULT_CONNECTION_LABEL
      }
    })
  }

  private async ensureAutomation(id: string) {
    const automation = await this.prisma.whatsappAutomation.findUnique({
      where: { id }
    })

    if (!automation) {
      throw new NotFoundException("Automação WhatsApp não encontrada.")
    }

    return automation
  }

  private resolveNextRunAt(
    kind: WhatsappAutomationKind,
    dto: WhatsappScheduleInput
  ) {
    return resolveWhatsappNextRunAt(kind, dto)
  }

  private validateAutomationSchedule(
    kind: WhatsappAutomationKind,
    dto: {
      scheduledFor?: string | Date | null
      timeOfDay?: string | null
      daysOfWeek?: number[] | null
      dayOfMonth?: number | null
      monthDay?: string | null
    }
  ) {
    if ((kind === WhatsappAutomationKind.ONE_SHOT || kind === WhatsappAutomationKind.REMINDER) && !dto.scheduledFor) {
      throw new BadRequestException("Informe a data e hora do agendamento.")
    }

    if (
      (kind === WhatsappAutomationKind.DAILY ||
        kind === WhatsappAutomationKind.WEEKLY ||
        kind === WhatsappAutomationKind.MONTHLY ||
        kind === WhatsappAutomationKind.BIRTHDAY) &&
      !dto.timeOfDay
    ) {
      throw new BadRequestException("Informe o horário da automação recorrente.")
    }

    if (kind === WhatsappAutomationKind.WEEKLY && (!dto.daysOfWeek || dto.daysOfWeek.length === 0)) {
      throw new BadRequestException("Informe ao menos um dia da semana.")
    }

    if (kind === WhatsappAutomationKind.MONTHLY && !dto.dayOfMonth) {
      throw new BadRequestException("Informe o dia do mês.")
    }

    if (kind === WhatsappAutomationKind.BIRTHDAY && !dto.monthDay) {
      throw new BadRequestException("Informe o mês e dia do aniversário.")
    }
  }

  private getNextAutomationRunAt(
    automation: WhatsappAutomation,
    scheduledFor: Date
  ) {
    if (
      automation.kind === WhatsappAutomationKind.ONE_SHOT ||
      automation.kind === WhatsappAutomationKind.REMINDER
    ) {
      return null
    }

    return this.resolveNextRunAt(automation.kind, {
      scheduledFor,
      timeOfDay: automation.timeOfDay,
      daysOfWeek: automation.daysOfWeek,
      dayOfMonth: automation.dayOfMonth,
      monthDay: automation.monthDay
    })
  }

  private buildNextDailyRun(reference: Date, hours: number, minutes: number) {
    const candidate = this.withTime(reference, hours, minutes)
    if (candidate.getTime() <= reference.getTime()) {
      candidate.setDate(candidate.getDate() + 1)
    }

    return candidate
  }

  private buildNextWeeklyRun(reference: Date, hours: number, minutes: number, daysOfWeek: number[]) {
    if (daysOfWeek.length === 0) {
      return this.buildNextDailyRun(reference, hours, minutes)
    }

    for (let offset = 0; offset < 14; offset += 1) {
      const candidate = new Date(reference)
      candidate.setDate(candidate.getDate() + offset)
      candidate.setHours(hours, minutes, 0, 0)

      if (daysOfWeek.includes(candidate.getDay()) && candidate.getTime() > reference.getTime()) {
        return candidate
      }
    }

    const fallback = this.withTime(reference, hours, minutes)
    fallback.setDate(fallback.getDate() + 7)
    return fallback
  }

  private buildNextMonthlyRun(reference: Date, hours: number, minutes: number, dayOfMonth: number) {
    const candidate = new Date(reference)
    candidate.setHours(hours, minutes, 0, 0)
    candidate.setDate(Math.min(dayOfMonth, this.getLastDayOfMonth(candidate.getFullYear(), candidate.getMonth())))

    if (candidate.getTime() <= reference.getTime()) {
      candidate.setMonth(candidate.getMonth() + 1)
      candidate.setDate(
        Math.min(dayOfMonth, this.getLastDayOfMonth(candidate.getFullYear(), candidate.getMonth()))
      )
    }

    return candidate
  }

  private buildNextYearlyRun(reference: Date, hours: number, minutes: number, monthDay: string) {
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

  private withTime(reference: Date, hours: number, minutes: number) {
    const candidate = new Date(reference)
    candidate.setHours(hours, minutes, 0, 0)
    return candidate
  }

  private parseTimeOfDay(timeOfDay: string) {
    const [hours, minutes] = timeOfDay.split(":").map((value) => Number(value))
    return [Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0]
  }

  private getLastDayOfMonth(year: number, monthIndex: number) {
    return new Date(year, monthIndex + 1, 0).getDate()
  }

  private toConnectionView(connection: WhatsappConnection): WhatsappConnectionView {
    return {
      id: connection.id,
      key: connection.key,
      label: connection.label,
      phoneNumber: connection.phoneNumber,
      status: connection.status,
      qrCode: connection.qrCode,
      lastConnectedAt: connection.lastConnectedAt?.toISOString() ?? null,
      lastDisconnectedAt: connection.lastDisconnectedAt?.toISOString() ?? null,
      lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
      lastError: connection.lastError,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString()
    }
  }

  private toAutomationView(automation: WhatsappAutomation): WhatsappAutomationView {
    return {
      id: automation.id,
      connectionId: automation.connectionId,
      title: automation.title,
      message: automation.message,
      kind: automation.kind,
      status: automation.status,
      targetType: automation.targetType,
      targetJid: automation.targetJid,
      targetJids: automation.targetJids,
      imageBase64: automation.imageBase64,
      imageMimeType: automation.imageMimeType,
      imageFileName: automation.imageFileName,
      mentionJids: automation.mentionJids,
      scheduledFor: automation.scheduledFor?.toISOString() ?? null,
      timeOfDay: automation.timeOfDay,
      daysOfWeek: automation.daysOfWeek,
      dayOfMonth: automation.dayOfMonth,
      monthDay: automation.monthDay,
      recurrenceTimeZone: automation.recurrenceTimeZone,
      lastRunAt: automation.lastRunAt?.toISOString() ?? null,
      nextRunAt: automation.nextRunAt?.toISOString() ?? null,
      lastStatus: automation.lastStatus,
      lastError: automation.lastError,
      createdAt: automation.createdAt.toISOString(),
      updatedAt: automation.updatedAt.toISOString()
    }
  }

  private toLogView(
    log: Pick<
      WhatsappDispatchLog,
      | "id"
      | "automationId"
      | "connectionId"
      | "dispatchKey"
      | "targetType"
      | "targetJid"
      | "message"
      | "status"
      | "attempts"
      | "errorMessage"
      | "sentAt"
      | "scheduledFor"
      | "triggeredBy"
      | "metadata"
      | "createdAt"
      | "updatedAt"
    >,
    details?: {
      automationTitle?: string | null
      targetName?: string | null
    }
  ): WhatsappDispatchLogView {
    return {
      id: log.id,
      automationId: log.automationId,
      automationTitle: details?.automationTitle ?? null,
      connectionId: log.connectionId,
      dispatchKey: log.dispatchKey,
      targetType: log.targetType,
      targetJid: log.targetJid,
      targetName: details?.targetName?.trim() || (log.targetType === WhatsappAutomationTargetType.GROUP ? "Grupo não encontrado" : "Contato não encontrado"),
      message: log.message,
      status: log.status,
      attempts: log.attempts,
      errorMessage: log.errorMessage,
      sentAt: log.sentAt?.toISOString() ?? null,
      scheduledFor: log.scheduledFor?.toISOString() ?? null,
      triggeredBy: log.triggeredBy,
      metadata: log.metadata ?? null,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString()
    }
  }

  private toGroupParticipantView(participant: WhatsappGroupParticipant): WhatsappGroupParticipantView {
    return {
      jid: participant.jid,
      name: participant.name,
      phoneNumber: participant.phoneNumber,
      mentionText: `@${participant.name}`,
      isAdmin: participant.isAdmin
    }
  }

  private toGroupView(group: WhatsappGroup): WhatsappGroupView {
    return {
      jid: group.jid,
      name: group.name
    }
  }

  private toContactView(contact: Pick<Contact, "name" | "phoneNumber">): WhatsappContactView {
    const phoneNumber = contact.phoneNumber ?? ""

    return {
      jid: `${phoneNumber}@s.whatsapp.net`,
      name: contact.name?.trim() || phoneNumber,
      phoneNumber
    }
  }

  private buildGroupSearchText(name: string, jid: string) {
    return buildSearchText([name, jid])
  }

  private extractPhoneNumberFromContactJid(jid: string) {
    const [identifier] = jid.split("@")
    const digits = identifier?.replace(/\D/g, "") ?? ""

    if (digits.length < 8 || digits.length > 15) {
      return null
    }

    return digits
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim()
    return normalized ? normalized : null
  }

  private getAutomationTargetJids(automation: Pick<WhatsappAutomation, "targetType" | "targetJid" | "targetJids">) {
    if (automation.targetType === WhatsappAutomationTargetType.GROUP) {
      return automation.targetJid ? [automation.targetJid] : []
    }

    const normalizedTargetJids = this.normalizeTargetJids(automation.targetJids)

    if (normalizedTargetJids.length > 0) {
      return normalizedTargetJids
    }

    return automation.targetJid ? this.normalizeTargetJids([automation.targetJid]) : []
  }

  private resolveTargetInput(
    targetType?: WhatsappAutomationTargetType | null,
    targetJid?: string | null,
    targetJids?: string[] | null
  ): WhatsappAutomationTargetInput {
    if (!targetType) {
      throw new BadRequestException("Informe o tipo e o destino da automação.")
    }

    if (targetType === WhatsappAutomationTargetType.GROUP) {
      const normalizedTargetJid = this.normalizeOptionalString(targetJid)

      if (!normalizedTargetJid) {
        throw new BadRequestException("Selecione um grupo como destino da automação.")
      }

      this.validateGroupJid(normalizedTargetJid)

      return {
        type: targetType,
        primaryJid: normalizedTargetJid,
        jids: []
      }
    }

    const resolvedTargetJids = this.normalizeTargetJids(targetJids ?? (targetJid ? [targetJid] : []))

    if (resolvedTargetJids.length === 0) {
      throw new BadRequestException("Selecione ao menos um contato como destino da automação.")
    }

    return {
      type: targetType,
      primaryJid: resolvedTargetJids[0],
      jids: resolvedTargetJids
    }
  }

  private normalizeTargetJids(values?: string[] | null) {
    const normalizedTargetJids = new Set<string>()

    for (const value of values ?? []) {
      const normalized = this.normalizeOptionalString(value)

      if (!normalized) {
        continue
      }

      this.validateContactJid(normalized)
      normalizedTargetJids.add(normalized)
    }

    return [...normalizedTargetJids]
  }

  private validateGroupJid(value?: string | null) {
    if (value && !WHATSAPP_GROUP_JID_PATTERN.test(value)) {
      throw new BadRequestException("Informe um JID de grupo no formato 120363000000000000@g.us.")
    }
  }

  private validateContactJid(value?: string | null) {
    if (value && !WHATSAPP_CONTACT_JID_PATTERN.test(value)) {
      throw new BadRequestException("Informe um JID de contato no formato 5511999999999@s.whatsapp.net ou contato@lid.")
    }
  }

  private validateTargetJid(type: WhatsappAutomationTargetType, jid: string) {
    if (type === WhatsappAutomationTargetType.GROUP) {
      this.validateGroupJid(jid)
      return
    }

    this.validateContactJid(jid)
  }

  private buildDirectorySearchWhere(search?: string | null) {
    const normalizedSearch = normalizeSearchTextPart(search)

    if (!normalizedSearch) {
      return {}
    }

    return {
      searchText: {
        contains: normalizedSearch
      }
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message
    }

    return "Falha ao processar a automação WhatsApp."
  }
}
