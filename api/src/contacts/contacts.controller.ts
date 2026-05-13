import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common"
import { AdminAuthGuard } from "../common/guards/admin-auth.guard"
import { ContactsService } from "./contacts.service"
import { CreateContactDto } from "./dto/create-contact.dto"
import { ListContactsDto } from "./dto/list-contacts.dto"
import { UpdateContactDto } from "./dto/update-contact.dto"

@Controller("contacts")
@UseGuards(AdminAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@Query() query: ListContactsDto) {
    return this.contactsService.findAll(query)
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto)
  }
}
