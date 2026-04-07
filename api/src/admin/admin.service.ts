import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { QuizStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RankingService } from "../ranking/ranking.service";
import { QuizService } from "../quiz/quiz.service";
import { CreateAllowedEmailDto } from "./dto/create-allowed-email.dto";
import { CreateAlternativeDto } from "./dto/create-alternative.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { CreateQuizDto } from "./dto/create-quiz.dto";

const WAITING_PRESENCE_TTL_MS = 30_000;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quizService: QuizService,
    private readonly rankingService: RankingService
  ) {}

  async listQuizzes() {
    await this.quizService.syncQuizStatuses();

    const quizzes = await this.prisma.quiz.findMany({
      include: {
        questions: {
          include: {
            alternatives: {
              orderBy: { order: "asc" }
            }
          },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { startTime: "desc" }
    });

    return quizzes.map((quiz) => ({
      ...quiz,
      endTime: new Date(quiz.startTime.getTime() + quiz.durationSeconds * 1000)
    }));
  }

  async createQuiz(dto: CreateQuizDto) {
    const startTime = new Date(dto.startTime);
    const status = startTime.getTime() > Date.now() ? QuizStatus.SCHEDULED : QuizStatus.RUNNING;

    await this.quizService.ensureNoSchedulingConflict({
      startTime,
      durationSeconds: dto.durationSeconds
    });

    return this.prisma.quiz.create({
      data: {
        title: dto.title.trim(),
        startTime,
        durationSeconds: dto.durationSeconds,
        status
      }
    });
  }

  async forceStartQuiz(quizId: string) {
    return this.quizService.forceStartQuiz(quizId);
  }

  async finishQuiz(quizId: string) {
    return this.quizService.finishQuizNow(quizId);
  }

  async addQuestion(quizId: string, dto: CreateQuestionDto) {
    const question = await this.prisma.question.create({
      data: {
        quizId,
        title: dto.title,
        order: dto.order
      }
    });

    await this.quizService.refreshQuizQuestionsCache(quizId);

    return question;
  }

  async addAlternative(questionId: string, dto: CreateAlternativeDto) {
    if (dto.isCorrect) {
      await this.prisma.alternative.updateMany({
        where: { questionId },
        data: { isCorrect: false }
      });
    }

    const alternative = await this.prisma.alternative.create({
      data: {
        questionId,
        text: dto.text,
        isCorrect: dto.isCorrect,
        order: dto.order
      }
    });

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { quizId: true }
    });

    if (question) {
      await this.quizService.refreshQuizQuestionsCache(question.quizId);
    }

    return alternative;
  }

  async addAllowedEmail(dto: CreateAllowedEmailDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    return this.prisma.allowedEmail.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail }
    });
  }

  async listAllowedEmails() {
    return this.prisma.allowedEmail.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async removeAllowedEmail(allowedEmailId: string) {
    const allowedEmail = await this.prisma.allowedEmail.findUnique({
      where: {
        id: allowedEmailId
      }
    });

    if (!allowedEmail) {
      throw new NotFoundException("Email liberado não encontrado.");
    }

    const activeParticipant = await this.prisma.participant.findFirst({
      where: {
        user: {
          email: allowedEmail.email
        },
        finishedAt: null
      }
    });

    if (activeParticipant) {
      throw new BadRequestException("Não é possível remover um participante com quiz em andamento.");
    }

    return this.prisma.allowedEmail.delete({
      where: {
        id: allowedEmailId
      }
    });
  }

  async getDashboard(quizId: string) {
    await this.quizService.syncQuizStatuses();
    await this.prisma.waitingPresence.deleteMany({
      where: {
        quizId,
        lastSeenAt: {
          lt: new Date(Date.now() - WAITING_PRESENCE_TTL_MS)
        }
      }
    });

    const [quiz, participants, answers, ranking, waitingPresences, totalParticipants] =
      await Promise.all([
        this.quizService.getQuizSummaryById(quizId, { sync: false }),
        this.prisma.participant.findMany({
          where: { quizId },
          include: {
            user: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }),
        this.prisma.answer.findMany({
          where: {
            participant: {
              quizId
            }
          },
          include: {
            question: true,
            alternative: true,
            participant: {
              include: {
                user: true
              }
            }
          },
          orderBy: {
            answeredAt: "desc"
          }
        }),
        this.rankingService.getQuizRanking(quizId),
        this.prisma.waitingPresence.findMany({
          where: {
            quizId
          },
          select: {
            userId: true
          }
        }),
        this.prisma.allowedEmail.count()
      ]);

    const confirmedParticipants = new Set([
      ...participants.map((participant) => participant.userId),
      ...waitingPresences.map((presence) => presence.userId)
    ]).size;
    const startedParticipants = participants.length;
    const enteredParticipants =
      quiz.status === QuizStatus.RUNNING || quiz.status === QuizStatus.FINISHED
        ? startedParticipants
        : confirmedParticipants;

    return {
      quiz,
      totalParticipants,
      enteredParticipants,
      confirmedParticipants,
      startedParticipants,
      finishedParticipants: participants.filter((participant) => participant.finishedAt).length,
      pendingParticipants: participants.filter((participant) => !participant.finishedAt).length,
      ranking,
      participants: participants.map((participant) => ({
        id: participant.id,
        name: participant.user.name ?? participant.user.email,
        email: participant.user.email,
        startedAt: participant.startedAt,
        finishedAt: participant.finishedAt,
        score: participant.score,
        totalTimeSeconds: participant.totalTimeSeconds
      })),
      answers: answers.map((answer) => ({
        id: answer.id,
        question: answer.question.title,
        alternative: answer.alternative.text,
        isCorrect: answer.isCorrect,
        answeredAt: answer.answeredAt,
        participantName: answer.participant.user.name ?? answer.participant.user.email
      }))
    };
  }
}
