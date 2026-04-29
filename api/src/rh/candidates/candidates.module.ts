import { Module } from "@nestjs/common"
import { PrismaModule } from "../../prisma/prisma.module"
import { RhAuthModule } from "../auth/rh-auth.module"
import { CandidatesController } from "./candidates.controller"
import { CandidatesService } from "./candidates.service"

@Module({
  imports: [PrismaModule, RhAuthModule],
  controllers: [CandidatesController],
  providers: [CandidatesService]
})
export class CandidatesModule {}
