import { Module } from "@nestjs/common"
import { AuthModule } from "../auth/auth.module"
import { AdminAuthGuard } from "../common/guards/admin-auth.guard"
import { PrismaModule } from "../prisma/prisma.module"
import { ContactsController } from "./contacts.controller"
import { ContactsService } from "./contacts.service"

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ContactsController],
  providers: [ContactsService, AdminAuthGuard]
})
export class ContactsModule {}
