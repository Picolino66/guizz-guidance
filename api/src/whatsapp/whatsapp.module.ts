import { Module } from "@nestjs/common"
import { AuthModule } from "../auth/auth.module"
import { PrismaModule } from "../prisma/prisma.module"
import { AdminAuthGuard } from "../common/guards/admin-auth.guard"
import { WhatsappAdapter } from "./whatsapp.adapter"
import { WhatsappController } from "./whatsapp.controller"
import { WhatsappGateway } from "./whatsapp.gateway"
import { WhatsappService } from "./whatsapp.service"

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WhatsappController],
  providers: [WhatsappAdapter, WhatsappService, WhatsappGateway, AdminAuthGuard]
})
export class WhatsappModule {}
