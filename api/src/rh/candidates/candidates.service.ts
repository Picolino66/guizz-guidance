import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../../prisma/prisma.service"
import { CreateCandidateDto, UpdateCandidateDto } from "./dto/candidate.dto"

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCandidateDto) {
    return this.prisma.candidate.create({ data: dto })
  }

  findAll() {
    return this.prisma.candidate.findMany({ orderBy: { name: "asc" } })
  }

  async findOne(id: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } })
    if (!candidate) throw new NotFoundException("Candidato não encontrado.")
    return candidate
  }

  async update(id: string, dto: UpdateCandidateDto) {
    await this.findOne(id)
    return this.prisma.candidate.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.candidate.delete({ where: { id } })
    return { success: true }
  }
}
