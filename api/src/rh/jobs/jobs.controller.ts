import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common"
import { RhAuthGuard } from "../auth/rh-auth.guard"
import { CreateJobDto, UpdateJobDto } from "./dto/job.dto"
import { JobsService } from "./jobs.service"

@Controller("rh/jobs")
@UseGuards(RhAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto)
  }

  @Get()
  findAll() {
    return this.jobsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.jobsService.findOne(id)
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.jobsService.remove(id)
  }
}
