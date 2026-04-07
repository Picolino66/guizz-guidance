import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ParticipantAuthGuard } from "../common/guards/participant-auth.guard";
import { QuizService } from "./quiz.service";

@Controller("quiz")
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get("active")
  getActiveQuiz() {
    return this.quizService.getActiveQuiz();
  }

  @UseGuards(ParticipantAuthGuard)
  @Get(":id/questions")
  getQuizQuestions(@Param("id") quizId: string) {
    return this.quizService.getQuizQuestions(quizId);
  }
}
