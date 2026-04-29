import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common"
import { RhAuthGuard } from "../auth/rh-auth.guard"
import { CreateCandidateDto, UpdateCandidateDto } from "./dto/candidate.dto"
import { CandidatesService } from "./candidates.service"

@Controller("rh/candidates")
@UseGuards(RhAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  create(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(dto)
  }

  @Get()
  findAll() {
    return this.candidatesService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.candidatesService.findOne(id)
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.candidatesService.remove(id)
  }
}
