import { Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import { PrismaService } from "../../prisma/prisma.service"
import * as bcrypt from "bcrypt"

@Injectable()
export class RhAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.systemUser.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!user) throw new UnauthorizedException("Credenciais inválidas.")

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException("Credenciais inválidas.")

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.configService.getOrThrow<string>("JWT_SECRET"),
        expiresIn: "12h"
      }
    )

    return { accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  }
}
