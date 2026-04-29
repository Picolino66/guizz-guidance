import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common"
import { RhAuthGuard } from "../auth/rh-auth.guard"
import { CurrentRhUser } from "../auth/current-rh-user.decorator"
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
import { InterviewsService } from "./interviews.service"

@Controller("rh/interviews")
@UseGuards(RhAuthGuard)
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  create(@Body() dto: CreateInterviewDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.create(dto, actor)
  }

  @Get()
  findAll(@CurrentRhUser() actor: RhAuthPayload, @Query() filter: FilterInterviewsDto) {
    return this.interviewsService.findAll(actor, filter)
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.findOne(id, actor)
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateInterviewDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.update(id, dto, actor)
  }

  @Post(":id/assign")
  assign(@Param("id") id: string, @Body() dto: AssignInterviewDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.assign(id, dto, actor)
  }

  @Post(":id/slots")
  suggestSlots(@Param("id") id: string, @Body() dto: SuggestSlotsDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.suggestSlots(id, dto, actor)
  }

  @Post(":id/confirm-slot")
  confirmSlot(@Param("id") id: string, @Body() dto: ConfirmSlotDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.confirmSlot(id, dto, actor)
  }

  @Post(":id/counter-slots")
  counterSlots(@Param("id") id: string, @Body() dto: CounterSlotsDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.counterSlots(id, dto, actor)
  }

  @Post(":id/rh-approve-slot")
  rhApproveSlot(@Param("id") id: string, @Body() dto: ConfirmSlotDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.rhApproveSlot(id, dto, actor)
  }

  @Post(":id/mark-done")
  markDone(@Param("id") id: string, @Body() dto: MarkDoneDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.markDone(id, dto, actor)
  }

  @Post(":id/close")
  close(@Param("id") id: string, @Body() dto: CloseInterviewDto, @CurrentRhUser() actor: RhAuthPayload) {
    return this.interviewsService.close(id, dto, actor)
  }

  @Get(":id/audit")
  getAuditLog(@Param("id") id: string) {
    return this.interviewsService.getAuditLog(id)
  }
}
