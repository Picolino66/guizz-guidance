import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ParticipantAuthGuard } from "../common/guards/participant-auth.guard";
import { RealtimeModule } from "../realtime/realtime.module";
import { QuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [QuizController],
  providers: [QuizService, ParticipantAuthGuard],
  exports: [QuizService]
})
export class QuizModule {}
