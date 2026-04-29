import { Module } from "@nestjs/common"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthModule } from "../auth/rh-auth.module"
import { RhUsersController } from "./rh-users.controller"
import { RhUsersService } from "./rh-users.service"

@Module({
  imports: [PrismaModule, RhAuthModule],
  controllers: [RhUsersController],
  providers: [RhUsersService]
})
export class RhUsersModule {}
