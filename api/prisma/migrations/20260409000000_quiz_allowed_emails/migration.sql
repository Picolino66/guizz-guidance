-- CreateTable
CREATE TABLE "QuizAllowedEmail" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "allowedEmailId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAllowedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizAllowedEmail_quizId_allowedEmailId_key" ON "QuizAllowedEmail"("quizId", "allowedEmailId");

-- AddForeignKey
ALTER TABLE "QuizAllowedEmail" ADD CONSTRAINT "QuizAllowedEmail_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAllowedEmail" ADD CONSTRAINT "QuizAllowedEmail_allowedEmailId_fkey" FOREIGN KEY ("allowedEmailId") REFERENCES "AllowedEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
