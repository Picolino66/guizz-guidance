import { Module } from "@nestjs/common"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthModule } from "../auth/rh-auth.module"
import { JobsController } from "./jobs.controller"
import { JobsService } from "./jobs.service"

@Module({
  imports: [PrismaModule, RhAuthModule],
  controllers: [JobsController],
  providers: [JobsService]
})
export class JobsModule {}
