import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedRequest } from "../types/authenticated-request.type";
import { AuthUser } from "../types/auth-user.type";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ParticipantAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Token ausente.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET")
      });

      if (payload.role !== "participant") {
        throw new ForbiddenException("Acesso restrito a participantes.");
      }

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub
        },
        select: {
          id: true
        }
      });

      if (!user) {
        throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Token inválido.");
    }
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const authorization = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const [type, token] = authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
