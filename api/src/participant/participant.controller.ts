import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ParticipantAuthGuard } from "../common/guards/participant-auth.guard";
import { AuthUser } from "../common/types/auth-user.type";
import { AnswerQuestionDto } from "./dto/answer-question.dto";
import { FinishParticipantDto } from "./dto/finish-participant.dto";
import { StartParticipantDto } from "./dto/start-participant.dto";
import { ParticipantService } from "./participant.service";

@UseGuards(ParticipantAuthGuard)
@Controller("participant")
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Post("start")
  start(@CurrentUser() user: AuthUser, @Body() dto: StartParticipantDto) {
    return this.participantService.start(user, dto);
  }

  @Post("answer")
  answer(@CurrentUser() user: AuthUser, @Body() dto: AnswerQuestionDto) {
    return this.participantService.answer(user, dto);
  }

  @Post("finish")
  finish(@CurrentUser() user: AuthUser, @Body() dto: FinishParticipantDto) {
    return this.participantService.finish(user, dto);
  }

  @Post("waiting-presence/:quizId")
  markWaitingPresence(@CurrentUser() user: AuthUser, @Param("quizId") quizId: string) {
    return this.participantService.markWaitingPresence(user, quizId);
  }

  @Delete("waiting-presence/:quizId")
  clearWaitingPresence(@CurrentUser() user: AuthUser, @Param("quizId") quizId: string) {
    return this.participantService.clearWaitingPresence(user, quizId);
  }

  @Get("quiz-state/:quizId")
  getQuizState(@CurrentUser() user: AuthUser, @Param("quizId") quizId: string) {
    return this.participantService.getQuizState(user, quizId);
  }
}
