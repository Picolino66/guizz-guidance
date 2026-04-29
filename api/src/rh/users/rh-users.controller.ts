import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common"
import { RhAuthGuard } from "../auth/rh-auth.guard"
import { CreateRhUserDto } from "./dto/create-rh-user.dto"
import { RhUsersService } from "./rh-users.service"

@Controller("rh/users")
@UseGuards(RhAuthGuard)
export class RhUsersController {
  constructor(private readonly rhUsersService: RhUsersService) {}

  @Post()
  create(@Body() dto: CreateRhUserDto) {
    return this.rhUsersService.create(dto)
  }

  @Get()
  findAll() {
    return this.rhUsersService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.rhUsersService.findOne(id)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.rhUsersService.remove(id)
  }
}
