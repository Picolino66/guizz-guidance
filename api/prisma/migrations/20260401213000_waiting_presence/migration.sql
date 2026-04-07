CREATE TABLE "WaitingPresence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quizId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaitingPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitingPresence_quizId_userId_key" ON "WaitingPresence"("quizId", "userId");
CREATE INDEX "WaitingPresence_quizId_lastSeenAt_idx" ON "WaitingPresence"("quizId", "lastSeenAt");
CREATE INDEX "WaitingPresence_userId_idx" ON "WaitingPresence"("userId");

ALTER TABLE "WaitingPresence"
  ADD CONSTRAINT "WaitingPresence_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WaitingPresence"
  ADD CONSTRAINT "WaitingPresence_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
