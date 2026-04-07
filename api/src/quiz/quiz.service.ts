import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { QuizStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { QuizGateway } from "../realtime/quiz.gateway";
import { buildRankingSnapshot } from "../ranking/ranking.utils";

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly quizGateway: QuizGateway
  ) {}

  async getActiveQuiz() {
    await this.syncQuizStatuses();

    const now = new Date();
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        OR: [{ startTime: { gte: now } }, { status: QuizStatus.RUNNING }]
      },
      orderBy: { startTime: "asc" }
    });

    if (!quiz) {
      return null;
    }

    return this.toQuizSummary(quiz);
  }

  async getQuizSummaryById(quizId: string, options?: { sync?: boolean }) {
    if (options?.sync !== false) {
      await this.syncQuizStatuses();
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz não encontrado.");
    }

    return this.toQuizSummary(quiz);
  }

  async getQuizQuestions(quizId: string) {
    const cached = await this.redis.get(`quiz:questions:${quizId}`)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fallback: cache miss (ex: Redis reiniciado), busca no banco e aquece
    return this.refreshQuizQuestionsCache(quizId)
  }

  async refreshQuizQuestionsCache(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            alternatives: {
              orderBy: { order: "asc" }
            }
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz não encontrado.");
    }

    const result = {
      id: quiz.id,
      title: quiz.title,
      status: this.computeStatus(quiz.startTime, quiz.durationSeconds, quiz.status),
      questions: quiz.questions.map((question) => ({
        id: question.id,
        title: question.title,
        order: question.order,
        alternatives: question.alternatives.map((alternative) => ({
          id: alternative.id,
          text: alternative.text,
          order: alternative.order
        }))
      }))
    }

    await this.redis.set(`quiz:questions:${quizId}`, JSON.stringify(result))

    return result
  }

  async ensureQuizIsRunning(quizId: string) {
    const quiz = await this.getQuizSummaryById(quizId);
    if (quiz.status !== QuizStatus.RUNNING) {
      throw new ForbiddenException("O quiz não está em execução.");
    }

    return quiz;
  }

  async ensureNoSchedulingConflict(params: {
    startTime: Date;
    durationSeconds: number;
    excludeQuizId?: string;
  }) {
    await this.syncQuizStatuses();

    const proposedStart = params.startTime.getTime();
    const proposedEnd = proposedStart + params.durationSeconds * 1000;

    const quizzes = await this.prisma.quiz.findMany({
      where: params.excludeQuizId
        ? {
            id: {
              not: params.excludeQuizId
            }
          }
        : undefined
    });

    const conflictingQuiz = quizzes.find((quiz) => {
      if (quiz.status === QuizStatus.DRAFT) {
        return false;
      }

      const otherStart = quiz.startTime.getTime();
      const otherEnd = otherStart + quiz.durationSeconds * 1000;

      return proposedStart < otherEnd && otherStart < proposedEnd;
    });

    if (conflictingQuiz) {
      throw new BadRequestException("Não pode haver sobreposição entre quizzes.");
    }
  }

  async forceStartQuiz(quizId: string) {
    await this.syncQuizStatuses();

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz não encontrado.");
    }

    const computedStatus = this.computeStatus(quiz.startTime, quiz.durationSeconds, quiz.status);
    if (computedStatus === QuizStatus.FINISHED) {
      throw new BadRequestException("Quiz finalizado não pode ser reiniciado.");
    }

    if (computedStatus === QuizStatus.RUNNING) {
      return this.toQuizSummary(quiz);
    }

    const startedAt = new Date();
    await this.ensureNoSchedulingConflict({
      startTime: startedAt,
      durationSeconds: quiz.durationSeconds,
      excludeQuizId: quiz.id
    });

    const updatedQuiz = await this.prisma.quiz.update({
      where: { id: quiz.id },
      data: {
        startTime: startedAt,
        status: QuizStatus.RUNNING
      }
    });

    this.quizGateway.emitQuizStarted({
      quizId: updatedQuiz.id,
      startedAt: updatedQuiz.startTime.toISOString()
    });

    return this.toQuizSummary(updatedQuiz);
  }

  async finishQuizNow(quizId: string) {
    await this.syncQuizStatuses();

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz não encontrado.");
    }

    const computedStatus = this.computeStatus(quiz.startTime, quiz.durationSeconds, quiz.status);

    if (quiz.status === QuizStatus.FINISHED) {
      return this.toQuizSummary(quiz);
    }

    if (computedStatus === QuizStatus.DRAFT || computedStatus === QuizStatus.SCHEDULED) {
      throw new BadRequestException("Somente quiz em andamento pode ser encerrado manualmente.");
    }

    return this.finalizeQuiz(quiz, new Date());
  }

  async syncQuizStatuses() {
    const now = new Date();
    const quizzes = await this.prisma.quiz.findMany({
      where: {
        status: {
          in: [QuizStatus.SCHEDULED, QuizStatus.RUNNING]
        }
      }
    });

    for (const quiz of quizzes) {
      const nextStatus = this.computeStatus(quiz.startTime, quiz.durationSeconds, quiz.status);

      if (nextStatus !== quiz.status) {
        if (nextStatus === QuizStatus.FINISHED) {
          await this.finalizeQuiz(quiz, now);
          continue;
        }

        await this.prisma.quiz.update({
          where: { id: quiz.id },
          data: { status: nextStatus }
        });

        if (nextStatus === QuizStatus.RUNNING) {
          this.quizGateway.emitQuizStarted({
            quizId: quiz.id,
            startedAt: quiz.startTime.toISOString()
          });
        }
      }
    }
  }

  private toQuizSummary(quiz: {
    id: string;
    title: string;
    startTime: Date;
    durationSeconds: number;
    status: QuizStatus;
  }) {
    const computedStatus = this.computeStatus(quiz.startTime, quiz.durationSeconds, quiz.status);

    return {
      id: quiz.id,
      title: quiz.title,
      startTime: quiz.startTime,
      durationSeconds: quiz.durationSeconds,
      endTime: new Date(quiz.startTime.getTime() + quiz.durationSeconds * 1000),
      status: computedStatus
    };
  }

  private computeStatus(startTime: Date, durationSeconds: number, persistedStatus: QuizStatus) {
    if (persistedStatus === QuizStatus.DRAFT) {
      return QuizStatus.DRAFT;
    }

    if (persistedStatus === QuizStatus.FINISHED) {
      return QuizStatus.FINISHED;
    }

    const now = Date.now();
    const start = startTime.getTime();
    const end = start + durationSeconds * 1000;

    if (now < start) {
      return QuizStatus.SCHEDULED;
    }

    if (now >= end) {
      return QuizStatus.FINISHED;
    }

    return QuizStatus.RUNNING;
  }

  private async finalizeQuiz(
    quiz: {
      id: string;
      title: string;
      startTime: Date;
      durationSeconds: number;
      status: QuizStatus;
    },
    finishedAt: Date
  ) {
    const updatedQuiz =
      quiz.status === QuizStatus.FINISHED
        ? quiz
        : await this.prisma.quiz.update({
            where: { id: quiz.id },
            data: {
              status: QuizStatus.FINISHED
            }
          });

    await this.finalizeOpenParticipants(quiz.id, finishedAt);
    await this.prisma.waitingPresence.deleteMany({
      where: {
        quizId: quiz.id
      }
    });
    await this.redis.del(`quiz:questions:${quiz.id}`);

    this.quizGateway.emitQuizFinished({
      quizId: quiz.id,
      finishedAt: finishedAt.toISOString()
    });
    await this.emitRankingSnapshot(quiz.id);

    return this.toQuizSummary(updatedQuiz);
  }

  private async finalizeOpenParticipants(quizId: string, finishedAt: Date) {
    const participants = await this.prisma.participant.findMany({
      where: {
        quizId,
        finishedAt: null
      },
      include: {
        answers: true
      }
    });

    await Promise.all(
      participants.map((participant) =>
        this.prisma.participant.update({
          where: { id: participant.id },
          data: {
            finishedAt,
            totalTimeSeconds: Math.max(
              1,
              Math.ceil((finishedAt.getTime() - participant.startedAt.getTime()) / 1000)
            ),
            score: participant.answers.filter((answer) => answer.isCorrect).length
          }
        })
      )
    );
  }

  private async emitRankingSnapshot(quizId: string) {
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
      orderBy: [{ score: "desc" }, { totalTimeSeconds: "asc" }]
    });

    this.quizGateway.emitRankingUpdated({
      quizId,
      ranking: buildRankingSnapshot(participants)
    });
  }
}
