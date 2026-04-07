CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'FINISHED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Admin" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "username" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllowedEmail" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllowedEmail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quiz" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Question" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quizId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Alternative" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "questionId" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alternative_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Participant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quizId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "totalTimeSeconds" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Answer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "participantId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "alternativeId" UUID NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responseTimeMs" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "AllowedEmail_email_key" ON "AllowedEmail"("email");
CREATE UNIQUE INDEX "Question_quizId_order_key" ON "Question"("quizId", "order");
CREATE UNIQUE INDEX "Alternative_questionId_order_key" ON "Alternative"("questionId", "order");
CREATE UNIQUE INDEX "Participant_quizId_userId_key" ON "Participant"("quizId", "userId");
CREATE UNIQUE INDEX "Answer_participantId_questionId_key" ON "Answer"("participantId", "questionId");

CREATE INDEX "idx_quiz_time" ON "Quiz"("startTime", "status");
CREATE INDEX "idx_participant_quiz" ON "Participant"("quizId");
CREATE INDEX "idx_answer_participant" ON "Answer"("participantId");

ALTER TABLE "Question"
  ADD CONSTRAINT "Question_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Alternative"
  ADD CONSTRAINT "Alternative_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Participant"
  ADD CONSTRAINT "Participant_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Participant"
  ADD CONSTRAINT "Participant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Answer"
  ADD CONSTRAINT "Answer_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Answer"
  ADD CONSTRAINT "Answer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Answer"
  ADD CONSTRAINT "Answer_alternativeId_fkey"
  FOREIGN KEY ("alternativeId") REFERENCES "Alternative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
