import { Controller, Get, Param } from "@nestjs/common";
import { RankingService } from "./ranking.service";

@Controller("quiz")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get(":id/ranking")
  getRanking(@Param("id") quizId: string) {
    return this.rankingService.getQuizRanking(quizId);
  }
}
