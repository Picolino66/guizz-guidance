import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { RhAuthPayload } from "../auth/rh-auth.guard"
import { CreateFormTemplateDto, UpdateFormTemplateDto } from "./dto/form-template.dto"

const TEMPLATE_INCLUDE = { questions: { orderBy: { order: "asc" as const } }, createdBy: { select: { id: true, name: true } } }

@Injectable()
export class FormTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFormTemplateDto, actor: RhAuthPayload) {
    return this.prisma.formTemplate.create({
      data: {
        name: dto.name,
        createdById: actor.sub,
        questions: {
          create: dto.questions.map((q, i) => ({ ...q, order: i + 1 }))
        }
      },
      include: TEMPLATE_INCLUDE
    })
  }

  findAll() {
    return this.prisma.formTemplate.findMany({ include: TEMPLATE_INCLUDE, orderBy: { createdAt: "desc" } })
  }

  async findOne(id: string) {
    const template = await this.prisma.formTemplate.findUnique({ where: { id }, include: TEMPLATE_INCLUDE })
    if (!template) throw new NotFoundException("Template não encontrado.")
    return template
  }

  async update(id: string, dto: UpdateFormTemplateDto, actor: RhAuthPayload) {
    const template = await this.findOne(id)
    if (template.isLocked) throw new BadRequestException("Template em uso, não pode ser editado. Use duplicar.")

    await this.prisma.formQuestion.deleteMany({ where: { templateId: id } })

    return this.prisma.formTemplate.update({
      where: { id },
      data: {
        name: dto.name ?? template.name,
        questions: dto.questions
          ? { create: dto.questions.map((q, i) => ({ ...q, order: i + 1 })) }
          : undefined
      },
      include: TEMPLATE_INCLUDE
    })
  }

  async duplicate(id: string, actor: RhAuthPayload) {
    const source = await this.findOne(id)
    return this.prisma.formTemplate.create({
      data: {
        name: `${source.name} (cópia)`,
        version: source.version + 1,
        createdById: actor.sub,
        questions: {
          create: source.questions.map((q: any) => ({
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options,
            order: q.order
          }))
        }
      },
      include: TEMPLATE_INCLUDE
    })
  }

  async lockTemplate(id: string) {
    return this.prisma.formTemplate.update({ where: { id }, data: { isLocked: true } })
  }
}
