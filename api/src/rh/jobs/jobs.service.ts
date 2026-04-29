import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { CreateJobDto, UpdateJobDto } from "./dto/job.dto"

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateJobDto) {
    return this.prisma.jobPosition.create({ data: dto })
  }

  findAll() {
    return this.prisma.jobPosition.findMany({ orderBy: { titulo: "asc" } })
  }

  async findOne(id: string) {
    const job = await this.prisma.jobPosition.findUnique({ where: { id } })
    if (!job) throw new NotFoundException("Vaga não encontrada.")
    return job
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id)
    return this.prisma.jobPosition.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.jobPosition.delete({ where: { id } })
    return { success: true }
  }
}
