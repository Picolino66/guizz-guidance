-- RH Recrutamento: enums e modelos

CREATE TYPE "RhUserRole" AS ENUM ('RH', 'TECH');
CREATE TYPE "InterviewStatus" AS ENUM ('DRAFT', 'SCHEDULING', 'WAITING_TECH_CONFIRMATION', 'WAITING_RH_APPROVAL', 'SCHEDULED', 'DONE', 'EVALUATED', 'CLOSED');
CREATE TYPE "SlotStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');
CREATE TYPE "FormQuestionType" AS ENUM ('YES_NO', 'TEXT', 'TEXTAREA', 'SINGLE_CHOICE', 'NUMBER');
CREATE TYPE "InterviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'HOLD');

CREATE TABLE "RhUser" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "RhUserRole" NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RhUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RhUser_email_key" ON "RhUser"("email");

CREATE TABLE "Candidate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "linkedinUrl" TEXT,
  "pretensaoSenioridade" TEXT,
  "cidadeEstado" TEXT NOT NULL,
  "formacao" TEXT NOT NULL,
  "resumoProfissional" TEXT NOT NULL,
  "ferramentas" TEXT NOT NULL,
  "motivacaoMudanca" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobPosition" (
  "id" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "nivel" TEXT NOT NULL,
  "descricao" TEXT,
  "stackTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JobPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Interview" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "jobPositionId" TEXT NOT NULL,
  "status" "InterviewStatus" NOT NULL DEFAULT 'DRAFT',
  "templateId" TEXT,
  "confirmedSlotId" TEXT,
  "finalDecision" "InterviewDecision",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Interview_confirmedSlotId_key" ON "Interview"("confirmedSlotId");

CREATE TABLE "InterviewAssignee" (
  "interviewId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewAssignee_pkey" PRIMARY KEY ("interviewId","userId")
);

CREATE TABLE "InterviewSlot" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "status" "SlotStatus" NOT NULL DEFAULT 'PROPOSED',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InterviewSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isLocked" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormQuestion" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "type" "FormQuestionType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "FormQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FormSubmission_interviewId_key" ON "FormSubmission"("interviewId");

CREATE TABLE "FormAnswer" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "valueText" TEXT,
  "valueNumber" DOUBLE PRECISION,
  "valueBoolean" BOOLEAN,
  "valueChoice" TEXT,
  CONSTRAINT "FormAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_jobPositionId_fkey" FOREIGN KEY ("jobPositionId") REFERENCES "JobPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_confirmedSlotId_fkey" FOREIGN KEY ("confirmedSlotId") REFERENCES "InterviewSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewAssignee" ADD CONSTRAINT "InterviewAssignee_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewAssignee" ADD CONSTRAINT "InterviewAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RhUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "RhUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "RhUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "RhUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormAnswer" ADD CONSTRAINT "FormAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormAnswer" ADD CONSTRAINT "FormAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FormQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "RhUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
