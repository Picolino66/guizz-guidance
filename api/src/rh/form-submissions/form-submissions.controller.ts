import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common"
import { RhAuthGuard } from "../auth/rh-auth.guard"
import { CurrentRhUser } from "../auth/current-rh-user.decorator"
import { RhAuthPayload } from "../auth/rh-auth.guard"
import { SubmitFormDto } from "./dto/form-submission.dto"
import { FormSubmissionsService } from "./form-submissions.service"

@Controller("rh/interviews/:interviewId/submission")
@UseGuards(RhAuthGuard)
export class FormSubmissionsController {
  constructor(private readonly formSubmissionsService: FormSubmissionsService) {}

  @Post()
  submit(
    @Param("interviewId") interviewId: string,
    @Body() dto: SubmitFormDto,
    @CurrentRhUser() actor: RhAuthPayload
  ) {
    return this.formSubmissionsService.submit(interviewId, dto, actor)
  }

  @Get()
  findByInterview(@Param("interviewId") interviewId: string, @CurrentRhUser() actor: RhAuthPayload) {
    return this.formSubmissionsService.findByInterview(interviewId, actor)
  }
}
