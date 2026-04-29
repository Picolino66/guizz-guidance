import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { QuizStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "../common/types/auth-user.type";
import { AnswerQuestionDto } from "./dto/answer-question.dto";
import { FinishParticipantDto } from "./dto/finish-participant.dto";
import { StartParticipantDto } from "./dto/start-participant.dto";
import { QuizService } from "../quiz/quiz.service";
import { QuizGateway } from "../realtime/quiz.gateway";
import { buildRankingSnapshot } from "../ranking/ranking.utils";

const WAITING_PRESENCE_TTL_MS = 30_000;

@Injectable()
export class ParticipantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizService: QuizService,
    private readonly quizGateway: QuizGateway
  ) {}

  async start(user: AuthUser, dto: StartParticipantDto) {
    const quiz = await this.quizService.ensureQuizIsRunning(dto.quizId);

    const emailLink = await this.prisma.quizAllowedEmail.findFirst({
      where: {
        quizId: dto.quizId,
        allowedEmail: { email: user.email }
      }
    });

    if (!emailLink) {
      throw new ForbiddenException("Você não está na lista de participantes deste quiz.");
    }

    const existingParticipant = await this.prisma.participant.findUnique({
      where: {
        quizId_userId: {
          quizId: dto.quizId,
          userId: user.sub
        }
      },
      include: {
        answers: {
          select: {
            questionId: true,
            alternativeId: true
          }
        }
      }
    });

    if (existingParticipant?.finishedAt) {
      throw new ForbiddenException("Tentativa já finalizada para este quiz.");
    }

    const participant =
      existingParticipant ??
      (await this.prisma.participant.create({
        data: {
          quizId: dto.quizId,
          userId: user.sub,
          startedAt: quiz.startTime
        },
        include: {
          answers: {
            select: {
              questionId: true,
              alternativeId: true
            }
          }
        }
      }));

    await this.clearWaitingPresence(user, dto.quizId);

    return {
      participantId: participant.id,
      quizId: quiz.id,
      startedAt: participant.startedAt,
      answeredQuestionIds: participant.answers.map((answer) => answer.questionId),
      answers: participant.answers.map((answer) => ({
        questionId: answer.questionId,
        alternativeId: answer.alternativeId
      }))
    };
  }

  async answer(user: AuthUser, dto: AnswerQuestionDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      include: {
        alternatives: true
      }
    });

    if (!question) {
      throw new NotFoundException("Pergunta não encontrada para o quiz em andamento.");
    }

    const participant = await this.findActiveParticipant(user.sub, question.quizId);

    const alternative = question.alternatives.find((item) => item.id === dto.alternativeId);
    if (!alternative) {
      throw new BadRequestException("Alternativa inválida para a pergunta.");
    }

    const responseTimeMs = Date.now() - participant.startedAt.getTime();
    const answer = await this.prisma.answer.upsert({
      where: {
        participantId_questionId: {
          participantId: participant.id,
          questionId: dto.questionId
        }
      },
      update: {
        alternativeId: alternative.id,
        isCorrect: alternative.isCorrect,
        answeredAt: new Date(),
        responseTimeMs
      },
      create: {
        participantId: participant.id,
        questionId: dto.questionId,
        alternativeId: alternative.id,
        isCorrect: alternative.isCorrect,
        responseTimeMs
      }
    });

    const ranking = await this.getRankingSnapshot(participant.quizId);
    this.quizGateway.emitRankingUpdated({
      quizId: participant.quizId,
      ranking
    });

    return answer;
  }

  async finish(user: AuthUser, dto: FinishParticipantDto) {
    const participant = await this.findActiveParticipant(user.sub, dto.quizId);
    const finalized = await this.finalizeParticipant(participant.id);
    await this.finishQuizIfEveryoneCompleted(participant.quizId);
    const ranking = await this.getRankingSnapshot(participant.quizId);

    this.quizGateway.emitParticipantFinished({
      quizId: participant.quizId,
      participantId: participant.id,
      userId: user.sub
    });
    this.quizGateway.emitRankingUpdated({
      quizId: participant.quizId,
      ranking
    });

    return finalized;
  }

  async markWaitingPresence(user: AuthUser, quizId: string) {
    const quiz = await this.quizService.getQuizSummaryById(quizId);
    if (quiz.status === QuizStatus.FINISHED || quiz.status === QuizStatus.DRAFT) {
      await this.clearWaitingPresence(user, quizId);

      return {
        active: false
      };
    }

    await this.cleanupExpiredWaitingPresence(quizId);

    const lastSeenAt = new Date();
    const presence = await this.prisma.waitingPresence.upsert({
      where: {
        quizId_userId: {
          quizId,
          userId: user.sub
        }
      },
      update: {
        email: user.email,
        lastSeenAt
      },
      create: {
        quizId,
        userId: user.sub,
        email: user.email,
        lastSeenAt
      }
    });

    return {
      active: true,
      lastSeenAt: presence.lastSeenAt
    };
  }

  async clearWaitingPresence(user: AuthUser, quizId: string) {
    await this.prisma.waitingPresence.deleteMany({
      where: {
        quizId,
        userId: user.sub
      }
    });

    return {
      removed: true
    };
  }

  async getQuizState(user: AuthUser, quizId: string) {
    await this.cleanupExpiredWaitingPresence(quizId);

    const quiz = await this.quizService.getQuizSummaryById(quizId);
    const participant = await this.prisma.participant.findUnique({
      where: {
        quizId_userId: {
          quizId,
          userId: user.sub
        }
      },
      include: {
        answers: {
          orderBy: {
            answeredAt: "asc"
          }
        }
      }
    });

    const [totalParticipants, finishedParticipants, whitelistParticipants, confirmedParticipants] =
      await Promise.all([
        this.prisma.participant.count({
          where: {
            quizId
          }
        }),
        this.prisma.participant.count({
          where: {
            quizId,
            finishedAt: {
              not: null
            }
          }
        }),
        this.prisma.quizAllowedEmail.count({ where: { quizId } }),
        this.prisma.waitingPresence.count({
          where: {
            quizId
          }
        })
      ]);

    return {
      quiz,
      viewerState: this.resolveViewerState({
        quizStatus: quiz.status,
        participantFinished: Boolean(participant?.finishedAt)
      }),
      participant: participant
        ? {
            id: participant.id,
            startedAt: participant.startedAt,
            finishedAt: participant.finishedAt,
            score: participant.score,
            totalTimeSeconds: participant.totalTimeSeconds,
            answers: participant.answers.map((answer) => ({
              questionId: answer.questionId,
              alternativeId: answer.alternativeId,
              answeredAt: answer.answeredAt
            }))
          }
        : null,
      totalParticipants,
      finishedParticipants,
      pendingParticipants: Math.max(totalParticipants - finishedParticipants, 0),
      whitelistParticipants,
      confirmedParticipants,
      waitingPendingParticipants: Math.max(whitelistParticipants - confirmedParticipants, 0)
    };
  }

  async finalizeParticipant(participantId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        answers: true
      }
    });

    if (!participant) {
      throw new NotFoundException("Participante não encontrado.");
    }

    if (participant.finishedAt) {
      return participant;
    }

    const finishedAt = new Date();
    const totalTimeSeconds = Math.max(
      1,
      Math.ceil((finishedAt.getTime() - participant.startedAt.getTime()) / 1000)
    );
    const score = participant.answers.filter((answer) => answer.isCorrect).length;

    return this.prisma.participant.update({
      where: { id: participant.id },
      data: {
        finishedAt,
        totalTimeSeconds,
        score
      }
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async cleanupWaitingPresenceJob() {
    await this.cleanupExpiredWaitingPresence();
  }

  private async findActiveParticipant(userId: string, quizId?: string) {
    const candidate = await this.prisma.participant.findFirst({
      where: {
        userId,
        quizId,
        finishedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!candidate) {
      throw new NotFoundException("Participante não encontrado para o quiz em andamento.");
    }

    const quiz = await this.quizService.getQuizSummaryById(candidate.quizId);
    if (quiz.status !== QuizStatus.RUNNING) {
      await this.finalizeParticipant(candidate.id);
      throw new ForbiddenException("O quiz já foi encerrado.");
    }

    return candidate;
  }

  private async finishQuizIfEveryoneCompleted(quizId: string) {
    const [totalParticipants, finishedParticipants] = await Promise.all([
      this.prisma.participant.count({
        where: {
          quizId
        }
      }),
      this.prisma.participant.count({
        where: {
          quizId,
          finishedAt: {
            not: null
          }
        }
      })
    ]);

    if (totalParticipants > 0 && totalParticipants === finishedParticipants) {
      await this.quizService.finishQuizNow(quizId);
    }
  }

  private resolveViewerState(params: {
    quizStatus: QuizStatus | "DRAFT" | "SCHEDULED" | "RUNNING" | "FINISHED";
    participantFinished: boolean;
  }) {
    if (params.participantFinished) {
      return params.quizStatus === QuizStatus.FINISHED ? "RESULT_READY" : "POST_QUIZ_WAITING";
    }

    if (params.quizStatus === QuizStatus.RUNNING) {
      return "IN_PROGRESS";
    }

    if (params.quizStatus === QuizStatus.FINISHED) {
      return "RESULT_READY";
    }

    return "PRE_QUIZ_WAITING";
  }

  private async getRankingSnapshot(quizId: string) {
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

    return buildRankingSnapshot(participants);
  }

  private async cleanupExpiredWaitingPresence(quizId?: string) {
    await this.prisma.waitingPresence.deleteMany({
      where: {
        ...(quizId ? { quizId } : {}),
        lastSeenAt: {
          lt: new Date(Date.now() - WAITING_PRESENCE_TTL_MS)
        }
      }
    });
  }
}
