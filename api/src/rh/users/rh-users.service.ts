import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { SystemRole } from "@prisma/client"
import { PrismaService } from "../../prisma/prisma.service"
import { CreateRhUserDto } from "./dto/create-rh-user.dto"
import * as bcrypt from "bcrypt"

@Injectable()
export class RhUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRhUserDto) {
    const exists = await this.prisma.systemUser.findUnique({ where: { email: dto.email.toLowerCase() } })
    if (exists) throw new ConflictException("E-mail já cadastrado.")

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.systemUser.create({
      data: { name: dto.name, email: dto.email.toLowerCase(), role: dto.role as SystemRole, passwordHash }
    })
    return this.sanitize(user)
  }

  async findAll() {
    const users = await this.prisma.systemUser.findMany({ orderBy: { name: "asc" } })
    return users.map(this.sanitize)
  }

  async findOne(id: string) {
    const user = await this.prisma.systemUser.findUnique({ where: { id } })
    if (!user) throw new NotFoundException("Usuário não encontrado.")
    return this.sanitize(user)
  }

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.systemUser.delete({ where: { id } })
    return { success: true }
  }

  private sanitize(user: any) {
    const { passwordHash, ...rest } = user
    return rest
  }
}
