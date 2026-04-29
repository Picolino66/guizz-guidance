import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { InterviewStatus } from "@prisma/client"
import { PrismaService } from "../../prisma/prisma.service"
import { RhAuthPayload } from "../auth/rh-auth.guard"
import { FormTemplatesService } from "../form-templates/form-templates.service"
import { SubmitFormDto } from "./dto/form-submission.dto"

@Injectable()
export class FormSubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly formTemplatesService: FormTemplatesService
  ) {}

  async submit(interviewId: string, dto: SubmitFormDto, actor: RhAuthPayload) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { submission: true }
    })
    if (!interview) throw new NotFoundException("Entrevista não encontrada.")

    const allowedStatuses: InterviewStatus[] = [InterviewStatus.SCHEDULED, InterviewStatus.DONE]
    if (!allowedStatuses.includes(interview.status)) {
      throw new BadRequestException("Formulário só pode ser submetido com entrevista agendada ou realizada.")
    }

    if (interview.submission) throw new BadRequestException("Formulário já submetido para esta entrevista.")

    if (interview.templateId) {
      await this.formTemplatesService.lockTemplate(interview.templateId)
    }

    const submission = await this.prisma.formSubmission.create({
      data: {
        interviewId,
        createdById: actor.sub,
        answers: {
          create: dto.answers.map((a) => ({
            questionId: a.questionId,
            valueText: a.valueText,
            valueNumber: a.valueNumber,
            valueBoolean: a.valueBoolean,
            valueChoice: a.valueChoice
          }))
        }
      },
      include: { answers: true }
    })

    await this.prisma.interview.update({
      where: { id: interviewId },
      data: { status: InterviewStatus.EVALUATED }
    })

    await this.prisma.auditLog.create({
      data: { interviewId, actorId: actor.sub, action: "FORM_SUBMITTED" }
    })

    return submission
  }

  async findByInterview(interviewId: string, _actor: RhAuthPayload) {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { interviewId },
      include: { answers: { include: { question: true } }, createdBy: { select: { id: true, name: true } } }
    })
    if (!submission) throw new NotFoundException("Formulário não encontrado.")
    return submission
  }
}
