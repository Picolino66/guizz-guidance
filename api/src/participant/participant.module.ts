import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ParticipantAuthGuard } from "../common/guards/participant-auth.guard";
import { ParticipantController } from "./participant.controller";
import { ParticipantService } from "./participant.service";
import { QuizModule } from "../quiz/quiz.module";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [AuthModule, QuizModule, RealtimeModule],
  controllers: [ParticipantController],
  providers: [ParticipantService, ParticipantAuthGuard]
})
export class ParticipantModule {}
