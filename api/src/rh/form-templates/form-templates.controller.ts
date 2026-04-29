import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common"
import { RhAuthGuard, RhAuthPayload } from "../auth/rh-auth.guard"
import { CurrentRhUser } from "../auth/current-rh-user.decorator"
import { CreateFormTemplateDto, UpdateFormTemplateDto } from "./dto/form-template.dto"
import { FormTemplatesService } from "./form-templates.service"

@Controller("rh/form-templates")
@UseGuards(RhAuthGuard)
export class FormTemplatesController {
  constructor(private readonly formTemplatesService: FormTemplatesService) {}

  @Post()
  create(@Body() dto: CreateFormTemplateDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.formTemplatesService.create(dto, actor)
  }

  @Get()
  findAll() {
    return this.formTemplatesService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.formTemplatesService.findOne(id)
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateFormTemplateDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.formTemplatesService.update(id, dto, actor)
  }

  @Post(":id/duplicate")
  duplicate(@Param("id") id: string, @CurrentRhUser() actor: RhAuthPayload) {
    return this.formTemplatesService.duplicate(id, actor)
  }
}
