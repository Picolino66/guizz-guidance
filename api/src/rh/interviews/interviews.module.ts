import { Module } from "@nestjs/common"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthModule } from "../auth/rh-auth.module"
import { InterviewsController } from "./interviews.controller"
import { InterviewsService } from "./interviews.service"

@Module({
  imports: [PrismaModule, RhAuthModule],
  controllers: [InterviewsController],
  providers: [InterviewsService]
})
export class InterviewsModule {}
