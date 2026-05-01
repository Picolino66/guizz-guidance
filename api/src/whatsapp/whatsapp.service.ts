import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit
} from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import {
  Prisma,
  WhatsappAutomation,
  WhatsappAutomationKind,
  WhatsappAutomationStatus,
  WhatsappConnection,
  WhatsappDispatchLog,
  WhatsappDispatchStatus,
  WhatsappSessionStatus
} from "@prisma/client"
import { PrismaService } from "../prisma/prisma.service"
import { CreateWhatsappAutomationDto } from "./dto/create-whatsapp-automation.dto"
import { ListWhatsappLogsDto } from "./dto/list-whatsapp-logs.dto"
import { SendWhatsappMessageDto } from "./dto/send-whatsapp-message.dto"
import { UpdateWhatsappAutomationDto } from "./dto/update-whatsapp-automation.dto"
import { UpdateWhatsappConnectionDto } from "./dto/update-whatsapp-connection.dto"
import { WhatsappAdapter } from "./whatsapp.adapter"
import { WhatsappGateway } from "./whatsapp.gateway"
import { resolveWhatsappNextRunAt, type WhatsappScheduleInput } from "./whatsapp-schedule"

const DEFAULT_CONNECTION_LABEL = "Canal WhatsApp Guidance"
const DEFAULT_TIME_ZONE = "America/Sao_Paulo"
const WHATSAPP_GROUP_JID_PATTERN = /^[\w.-]+@g\.us$/

export interface WhatsappConnectionView {
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

export interface WhatsappAutomationView {
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

export interface WhatsappDispatchLogView {
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
  metadata: Prisma.JsonValue | null
  createdAt: string
  updatedAt: string
}

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
    const groupJid = this.normalizeOptionalString(dto.groupJid)
    this.validateGroupJid(groupJid)

    const updated = await this.prisma.whatsappConnection.update({
      where: { id: connection.id },
      data: {
        label: dto.label?.trim() || connection.label,
        phoneNumber: this.normalizeOptionalString(dto.phoneNumber),
        groupName: this.normalizeOptionalString(dto.groupName),
        groupJid
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
    const rows = await this.prisma.whatsappDispatchLog.findMany({
      where: {
        connectionId: connection.id,
        ...(query.status ? { status: query.status } : {}),
        ...(query.automationId ? { automationId: query.automationId } : {})
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 20
    })

    return rows.map((log) => this.toLogView(log))
  }

  async createAutomation(dto: CreateWhatsappAutomationDto) {
    const connection = await this.ensurePrimaryConnection()
    this.validateAutomationSchedule(dto.kind, dto)
    const targetGroupJid = this.normalizeOptionalString(dto.targetGroupJid)
    this.validateGroupJid(targetGroupJid)
    const nextRunAt = this.resolveNextRunAt(dto.kind, dto)

    const row = await this.prisma.whatsappAutomation.create({
      data: {
        connectionId: connection.id,
        title: dto.title.trim(),
        message: dto.message.trim(),
        kind: dto.kind,
        status: dto.status ?? WhatsappAutomationStatus.ACTIVE,
        targetGroupJid,
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
    const targetGroupJid = dto.targetGroupJid === undefined ? undefined : this.normalizeOptionalString(dto.targetGroupJid)
    this.validateGroupJid(targetGroupJid)
    const runtimeInput = {
      scheduledFor: dto.scheduledFor ?? existing.scheduledFor?.toISOString() ?? null,
      timeOfDay: dto.timeOfDay ?? existing.timeOfDay,
      daysOfWeek: dto.daysOfWeek ?? existing.daysOfWeek,
      dayOfMonth: dto.dayOfMonth ?? existing.dayOfMonth,
      monthDay: dto.monthDay ?? existing.monthDay
    }
    this.validateAutomationSchedule(kind, runtimeInput)
    const nextRunAt = this.resolveNextRunAt(kind, runtimeInput)

    const row = await this.prisma.whatsappAutomation.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        message: dto.message?.trim(),
        kind: dto.kind,
        status: dto.status,
        targetGroupJid,
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
    const targetGroupJid = this.normalizeOptionalString(dto.targetGroupJid) ?? connection.groupJid
    this.validateGroupJid(targetGroupJid)

    if (!targetGroupJid) {
      throw new BadRequestException("Defina o grupo alvo antes de testar o envio.")
    }

    const dispatchKey = `manual:${connection.id}:${Date.now()}`
    const log = await this.prisma.whatsappDispatchLog.create({
      data: {
        connectionId: connection.id,
        dispatchKey,
        targetGroupJid,
        message: dto.message.trim(),
        status: WhatsappDispatchStatus.PENDING,
        attempts: 1,
        triggeredBy: "manual-test"
      }
    })

    try {
      await this.sendMessage(targetGroupJid, dto.message.trim())
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

  async listGroups() {
    if (!this.adapter.isReady()) {
      throw new BadRequestException("WhatsApp não está conectado. Conecte-se antes de listar os grupos.")
    }

    return this.adapter.getGroups()
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
    const targetGroupJid = automation.targetGroupJid ?? connection.groupJid

    if (!targetGroupJid) {
      const row = await this.prisma.whatsappDispatchLog.create({
        data: {
          automationId: automation.id,
          connectionId: connection.id,
          dispatchKey: `${automation.id}:${Date.now()}:missing-target`,
          targetGroupJid: connection.groupJid ?? "não-configurado",
          message: automation.message,
          status: WhatsappDispatchStatus.SKIPPED,
          attempts: 0,
          errorMessage: "Grupo alvo não configurado.",
          triggeredBy
        }
      })

      await this.prisma.whatsappAutomation.update({
        where: { id: automation.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: WhatsappDispatchStatus.SKIPPED,
          lastError: "Grupo alvo não configurado."
        }
      })

      return this.toLogView(row)
    }

    const scheduledFor = automation.nextRunAt ?? new Date()
    const dispatchKey = `${automation.id}:${scheduledFor.toISOString()}`
    const existingLog = await this.prisma.whatsappDispatchLog.findUnique({
      where: { dispatchKey }
    })

    if (existingLog) {
      return this.toLogView(existingLog)
    }

    const log = await this.prisma.whatsappDispatchLog.create({
      data: {
        automationId: automation.id,
        connectionId: connection.id,
        dispatchKey,
        targetGroupJid,
        message: automation.message,
        status: WhatsappDispatchStatus.PENDING,
        attempts: 1,
        scheduledFor,
        triggeredBy
      }
    })

    try {
      await this.sendMessage(targetGroupJid, automation.message)
      const updatedAutomation = await this.prisma.whatsappAutomation.update({
        where: { id: automation.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: WhatsappDispatchStatus.SENT,
          lastError: null,
          nextRunAt: this.getNextAutomationRunAt(automation, scheduledFor)
        }
      })
      const updatedLog = await this.prisma.whatsappDispatchLog.update({
        where: { id: log.id },
        data: {
          status: WhatsappDispatchStatus.SENT,
          sentAt: new Date()
        }
      })

      return {
        automation: this.toAutomationView(updatedAutomation),
        log: this.toLogView(updatedLog)
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
        await this.sendMessage(targetGroupJid, automation.message)
        const updatedAutomation = await this.prisma.whatsappAutomation.update({
          where: { id: automation.id },
          data: {
            lastRunAt: new Date(),
            lastStatus: WhatsappDispatchStatus.SENT,
            lastError: null,
            nextRunAt: this.getNextAutomationRunAt(automation, scheduledFor)
          }
        })
        const updatedLog = await this.prisma.whatsappDispatchLog.update({
          where: { id: log.id },
          data: {
            status: WhatsappDispatchStatus.SENT,
            sentAt: new Date(),
            attempts: 2,
            errorMessage: null
          }
        })

        return {
          automation: this.toAutomationView(updatedAutomation),
          log: this.toLogView(updatedLog)
        }
      } catch (retryErrorValue) {
        const failedAutomation = await this.prisma.whatsappAutomation.update({
          where: { id: automation.id },
          data: {
            lastRunAt: new Date(),
            lastStatus: WhatsappDispatchStatus.FAILED,
            lastError: this.getErrorMessage(retryErrorValue),
            nextRunAt: this.getNextAutomationRunAt(automation, scheduledFor)
          }
        })
        const failedLog = await this.prisma.whatsappDispatchLog.update({
          where: { id: log.id },
          data: {
            status: WhatsappDispatchStatus.FAILED,
            attempts: 2,
            errorMessage: this.getErrorMessage(retryErrorValue)
          }
        })

        return {
          automation: this.toAutomationView(failedAutomation),
          log: this.toLogView(failedLog)
        }
      }
    }
  }

  private async sendMessage(targetGroupJid: string, message: string) {
    if (!this.adapter.isReady()) {
      throw new BadRequestException("A conexão WhatsApp ainda não está pronta.")
    }

    await this.adapter.sendMessage(targetGroupJid, message)
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
      groupName: connection.groupName,
      groupJid: connection.groupJid,
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
      targetGroupJid: automation.targetGroupJid,
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

  private toLogView(log: WhatsappDispatchLog): WhatsappDispatchLogView {
    return {
      id: log.id,
      automationId: log.automationId,
      connectionId: log.connectionId,
      dispatchKey: log.dispatchKey,
      targetGroupJid: log.targetGroupJid,
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

  private normalizeOptionalString(value?: string | null) {
    const normalized = value?.trim()
    return normalized ? normalized : null
  }

  private validateGroupJid(value?: string | null) {
    if (value && !WHATSAPP_GROUP_JID_PATTERN.test(value)) {
      throw new BadRequestException("Informe um JID de grupo no formato 120363000000000000@g.us.")
    }
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message
    }

    return "Falha ao processar a automação WhatsApp."
  }
}
