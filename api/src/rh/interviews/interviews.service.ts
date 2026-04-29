import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { InterviewDecision, InterviewStatus, SlotStatus } from "@prisma/client"
import { PrismaService } from "../../prisma/prisma.service"
import { RhAuthPayload } from "../auth/rh-auth.guard"
import {
  AssignInterviewDto,
  CloseInterviewDto,
  ConfirmSlotDto,
  CounterSlotsDto,
  CreateInterviewDto,
  FilterInterviewsDto,
  MarkDoneDto,
  SuggestSlotsDto,
  UpdateInterviewDto
} from "./dto/interview.dto"

const INTERVIEW_INCLUDE = {
  candidate: true,
  jobPosition: true,
  assignees: { include: { user: { select: { id: true, name: true, role: true } } } },
  slots: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { startAt: "asc" as const } },
  confirmedSlot: true,
  formTemplate: { include: { questions: { orderBy: { order: "asc" as const } } } },
  submission: { include: { answers: true } },
  auditLogs: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" as const } }
}

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInterviewDto, actor: RhAuthPayload) {
    return this.prisma.interview.create({
      data: {
        candidateId: dto.candidateId,
        jobPositionId: dto.jobPositionId,
        templateId: dto.templateId,
        auditLogs: { create: { actorId: actor.sub, action: "INTERVIEW_CREATED" } }
      },
      include: INTERVIEW_INCLUDE
    })
  }

  async findAll(_actor: RhAuthPayload, filter: FilterInterviewsDto = {}) {
    const where: any = {}

    if (filter.status) where.status = filter.status
    if (filter.jobPositionId) where.jobPositionId = filter.jobPositionId
    if (filter.assigneeId) {
      where.assignees = { some: { userId: filter.assigneeId } }
    }

    return this.prisma.interview.findMany({
      where,
      include: INTERVIEW_INCLUDE,
      orderBy: { createdAt: "desc" }
    })
  }

  async findOne(id: string, _actor: RhAuthPayload) {
    const interview = await this.prisma.interview.findUnique({ where: { id }, include: INTERVIEW_INCLUDE })
    if (!interview) throw new NotFoundException("Entrevista não encontrada.")
    return interview
  }

  async update(id: string, dto: UpdateInterviewDto, _actor: RhAuthPayload) {
    await this.ensureExists(id)
    return this.prisma.interview.update({ where: { id }, data: dto, include: INTERVIEW_INCLUDE })
  }

  async assign(id: string, dto: AssignInterviewDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)

    await this.prisma.interviewAssignee.createMany({
      data: dto.userIds.map((userId) => ({ interviewId: id, userId })),
      skipDuplicates: true
    })

    if (interview.status === InterviewStatus.SCHEDULING) {
      const slotCount = await this.prisma.interviewSlot.count({ where: { interviewId: id } })
      if (slotCount > 0) {
        await this.prisma.interview.update({ where: { id }, data: { status: InterviewStatus.WAITING_TECH_CONFIRMATION } })
      }
    }
    await this.audit(id, actor.sub, "ASSIGNEES_ADDED", { userIds: dto.userIds })
    return this.findOne(id, actor)
  }

  async suggestSlots(id: string, dto: SuggestSlotsDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)

    const allowedStatuses: InterviewStatus[] = [InterviewStatus.DRAFT, InterviewStatus.SCHEDULING]
    if (!allowedStatuses.includes(interview.status)) {
      throw new BadRequestException("Status inválido para sugerir datas.")
    }

    await this.prisma.interviewSlot.createMany({
      data: dto.slots.map((s) => ({
        interviewId: id,
        startAt: new Date(s.startAt),
        endAt: s.endAt ? new Date(s.endAt) : null,
        createdById: actor.sub
      }))
    })

    const assigneeCount = await this.prisma.interviewAssignee.count({ where: { interviewId: id } })
    const nextStatus = assigneeCount > 0 ? InterviewStatus.WAITING_TECH_CONFIRMATION : InterviewStatus.SCHEDULING
    await this.prisma.interview.update({ where: { id }, data: { status: nextStatus } })
    await this.audit(id, actor.sub, "SLOTS_SUGGESTED", { slots: dto.slots })
    return this.findOne(id, actor)
  }

  async confirmSlot(id: string, dto: ConfirmSlotDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)
    if (interview.status !== InterviewStatus.WAITING_TECH_CONFIRMATION) {
      throw new BadRequestException("Status inválido para confirmar data.")
    }
    await this.applyConfirmedSlot(id, dto.slotId, actor.sub, "SLOT_CONFIRMED")
    return this.findOne(id, actor)
  }

  async counterSlots(id: string, dto: CounterSlotsDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)
    if (interview.status !== InterviewStatus.WAITING_TECH_CONFIRMATION) {
      throw new BadRequestException("Status inválido para contraproposta.")
    }

    await this.prisma.interviewSlot.updateMany({
      where: { interviewId: id, status: SlotStatus.PROPOSED },
      data: { status: SlotStatus.REJECTED }
    })
    await this.prisma.interviewSlot.createMany({
      data: dto.slots.map((s) => ({
        interviewId: id,
        startAt: new Date(s.startAt),
        endAt: s.endAt ? new Date(s.endAt) : null,
        createdById: actor.sub
      }))
    })
    await this.prisma.interview.update({ where: { id }, data: { status: InterviewStatus.WAITING_RH_APPROVAL } })
    await this.audit(id, actor.sub, "SLOTS_COUNTERED", { slots: dto.slots })
    return this.findOne(id, actor)
  }

  async rhApproveSlot(id: string, dto: ConfirmSlotDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)
    if (interview.status !== InterviewStatus.WAITING_RH_APPROVAL) {
      throw new BadRequestException("Status inválido para aprovar data.")
    }
    await this.applyConfirmedSlot(id, dto.slotId, actor.sub, "SLOT_APPROVED")
    return this.findOne(id, actor)
  }

  async markDone(id: string, dto: MarkDoneDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)
    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException("Status inválido para marcar como realizada.")
    }
    await this.prisma.interview.update({ where: { id }, data: { status: InterviewStatus.DONE } })
    await this.audit(id, actor.sub, "INTERVIEW_MARKED_DONE", { note: dto.note })
    return this.findOne(id, actor)
  }

  async close(id: string, dto: CloseInterviewDto, actor: RhAuthPayload) {
    const interview = await this.ensureExists(id)
    const closeable: InterviewStatus[] = [InterviewStatus.EVALUATED, InterviewStatus.DONE]
    if (!closeable.includes(interview.status)) {
      throw new BadRequestException("Status inválido para encerrar entrevista.")
    }
    await this.prisma.interview.update({
      where: { id },
      data: { status: InterviewStatus.CLOSED, finalDecision: dto.decision as InterviewDecision }
    })
    await this.audit(id, actor.sub, "INTERVIEW_CLOSED", { decision: dto.decision, note: dto.note })
    return this.findOne(id, actor)
  }

  async getAuditLog(id: string) {
    return this.prisma.auditLog.findMany({
      where: { interviewId: id },
      orderBy: { createdAt: "asc" },
      include: { actor: { select: { id: true, name: true, role: true } } }
    })
  }

  private async applyConfirmedSlot(interviewId: string, slotId: string, actorId: string, action: string) {
    await this.prisma.interviewSlot.updateMany({ where: { interviewId }, data: { status: SlotStatus.REJECTED } })
    await this.prisma.interviewSlot.update({ where: { id: slotId }, data: { status: SlotStatus.CONFIRMED } })
    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { status: InterviewStatus.SCHEDULED, confirmedSlotId: slotId }
    })
    await this.audit(interviewId, actorId, action, { slotId })
  }

  private async ensureExists(id: string) {
    const interview = await this.prisma.interview.findUnique({ where: { id } })
    if (!interview) throw new NotFoundException("Entrevista não encontrada.")
    return interview
  }

  private audit(interviewId: string, actorId: string, action: string, details?: unknown) {
    return this.prisma.auditLog.create({
      data: { interviewId, actorId, action, details: details ? (details as object) : undefined }
    })
  }
}
