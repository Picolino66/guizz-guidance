import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthController } from "./rh-auth.controller"
import { RhAuthService } from "./rh-auth.service"
import { RhAuthGuard } from "./rh-auth.guard"

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [RhAuthController],
  providers: [RhAuthService, RhAuthGuard],
  exports: [RhAuthGuard, JwtModule]
})
export class RhAuthModule {}
