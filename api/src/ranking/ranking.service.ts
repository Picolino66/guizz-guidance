import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { buildRankingSnapshot } from "./ranking.utils";

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuizRanking(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz não encontrado.");
    }

    const participants = await this.prisma.participant.findMany({
      where: {
        quizId,
        finishedAt: {
          not: null
        }
      },
      include: {
        user: true
      },
      orderBy: [
        { score: "desc" },
        { totalTimeSeconds: "asc" }
      ]
    });

    return buildRankingSnapshot(participants);
  }
}
