import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthUser } from "../common/types/auth-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { ChangeAdminPasswordDto } from "./dto/change-admin-password.dto";
import { LoginAdminDto } from "./dto/login-admin.dto";
import { LoginParticipantDto } from "./dto/login-participant.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async loginParticipant(dto: LoginParticipantDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const allowed = await this.prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail }
    });

    if (!allowed) {
      throw new UnauthorizedException("Email não autorizado para participar.");
    }

    const user = await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: {
        email: normalizedEmail,
        name: this.getNameFromEmail(normalizedEmail)
      }
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: "participant"
    });

    return {
      accessToken,
      user
    };
  }

  async loginAdmin(dto: LoginAdminDto) {
    const login = dto.login.trim().toLowerCase();
    const systemUser = await this.prisma.systemUser.findFirst({
      where: {
        OR: [
          { username: login },
          { email: login }
        ]
      }
    });

    if (!systemUser) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const validPassword = await bcrypt.compare(dto.password, systemUser.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: systemUser.id,
      email: systemUser.email,
      role: systemUser.role
    });

    return {
      accessToken,
      user: {
        id: systemUser.id,
        name: systemUser.name,
        username: systemUser.username,
        email: systemUser.email,
        role: systemUser.role
      }
    };
  }

  async changeAdminPassword(user: AuthUser, dto: ChangeAdminPasswordDto) {
    const systemUser = await this.prisma.systemUser.findUnique({
      where: { id: user.sub }
    });

    if (!systemUser) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    const validPassword = await bcrypt.compare(dto.currentPassword, systemUser.passwordHash);
    if (!validPassword) {
      throw new BadRequestException("Senha atual incorreta.");
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("A nova senha precisa ser diferente da senha atual.");
    }

    const nextPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.systemUser.update({
      where: { id: systemUser.id },
      data: { passwordHash: nextPasswordHash }
    });

    return {
      message: "Senha alterada com sucesso."
    };
  }

  private getNameFromEmail(email: string) {
    return email.split("@")[0].replace(/[._-]+/g, " ");
  }
}
