import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import { AdminAuthGuard } from "../common/guards/admin-auth.guard"
import { CreateWhatsappAutomationDto } from "./dto/create-whatsapp-automation.dto"
import { ListWhatsappLogsDto } from "./dto/list-whatsapp-logs.dto"
import { SendWhatsappMessageDto } from "./dto/send-whatsapp-message.dto"
import { UpdateWhatsappAutomationDto } from "./dto/update-whatsapp-automation.dto"
import { UpdateWhatsappConnectionDto } from "./dto/update-whatsapp-connection.dto"
import { WhatsappService } from "./whatsapp.service"

@Controller("whatsapp")
@UseGuards(AdminAuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get("overview")
  getOverview() {
    return this.whatsappService.getOverview()
  }

  @Get("status")
  getStatus() {
    return this.whatsappService.getConnection()
  }

  @Patch("connection")
  updateConnection(@Body() dto: UpdateWhatsappConnectionDto) {
    return this.whatsappService.updateConnection(dto)
  }

  @Post("connect")
  connect() {
    return this.whatsappService.connect()
  }

  @Post("disconnect")
  disconnect() {
    return this.whatsappService.disconnect()
  }

  @Get("automations")
  listAutomations() {
    return this.whatsappService.listAutomations()
  }

  @Post("automations")
  createAutomation(@Body() dto: CreateWhatsappAutomationDto) {
    return this.whatsappService.createAutomation(dto)
  }

  @Patch("automations/:id")
  updateAutomation(@Param("id") id: string, @Body() dto: UpdateWhatsappAutomationDto) {
    return this.whatsappService.updateAutomation(id, dto)
  }

  @Patch("automations/:id/toggle")
  toggleAutomation(@Param("id") id: string) {
    return this.whatsappService.toggleAutomation(id)
  }

  @Post("automations/:id/run-now")
  runAutomationNow(@Param("id") id: string) {
    return this.whatsappService.runAutomationNow(id)
  }

  @Delete("automations/:id")
  removeAutomation(@Param("id") id: string) {
    return this.whatsappService.removeAutomation(id)
  }

  @Get("logs")
  listLogs(@Query() query: ListWhatsappLogsDto) {
    return this.whatsappService.listLogs(query)
  }

  @Post("test-message")
  sendTestMessage(@Body() dto: SendWhatsappMessageDto) {
    return this.whatsappService.sendTestMessage(dto)
  }

  @Get("groups")
  listGroups() {
    return this.whatsappService.listGroups()
  }
}
