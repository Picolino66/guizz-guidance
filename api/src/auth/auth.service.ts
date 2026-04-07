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
    const admin = await this.prisma.admin.findFirst({
      where: {
        OR: [
          { username: login },
          { email: login }
        ]
      }
    });

    if (!admin) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const validPassword = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      username: admin.username,
      role: "admin"
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    };
  }

  async changeAdminPassword(user: AuthUser, dto: ChangeAdminPasswordDto) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        id: user.sub
      }
    });

    if (!admin) {
      throw new NotFoundException("Administrador não encontrado.");
    }

    const validPassword = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
    if (!validPassword) {
      throw new BadRequestException("Senha atual incorreta.");
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException("A nova senha precisa ser diferente da senha atual.");
    }

    const nextPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.admin.update({
      where: {
        id: admin.id
      },
      data: {
        passwordHash: nextPasswordHash
      }
    });

    return {
      message: "Senha alterada com sucesso."
    };
  }

  private getNameFromEmail(email: string) {
    return email.split("@")[0].replace(/[._-]+/g, " ");
  }
}
