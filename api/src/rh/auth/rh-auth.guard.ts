import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { ConfigService } from "@nestjs/config"
import { SystemRole } from "@prisma/client"

export interface RhAuthPayload {
  sub: string
  email: string
  role: SystemRole
}

@Injectable()
export class RhAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException("Token ausente.")

    try {
      const payload = await this.jwtService.verifyAsync<RhAuthPayload>(token, {
        secret: this.configService.getOrThrow<string>("JWT_SECRET")
      })
      request.rhUser = payload
    } catch {
      throw new UnauthorizedException("Token inválido.")
    }

    return true
  }

  private extractToken(request: any): string | undefined {
    const auth = request.headers?.authorization ?? ""
    const [type, token] = auth.split(" ")
    return type === "Bearer" ? token : undefined
  }
}
