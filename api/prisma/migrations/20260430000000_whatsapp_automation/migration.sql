-- WhatsApp automation: session, automations and logs

CREATE TYPE "WhatsappSessionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'QR_REQUIRED', 'READY', 'ERROR');
CREATE TYPE "WhatsappAutomationKind" AS ENUM ('ONE_SHOT', 'REMINDER', 'DAILY', 'WEEKLY', 'MONTHLY', 'BIRTHDAY');
CREATE TYPE "WhatsappAutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WhatsappDispatchStatus" AS ENUM ('PENDING', 'RETRYING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "WhatsappConnection" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL DEFAULT 'primary',
  "label" TEXT NOT NULL,
  "phoneNumber" TEXT,
  "groupName" TEXT,
  "groupJid" TEXT,
  "status" "WhatsappSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "qrCode" TEXT,
  "lastConnectedAt" TIMESTAMP(3),
  "lastDisconnectedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsappConnection_key_key" ON "WhatsappConnection"("key");

CREATE TABLE "WhatsappAutomation" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "kind" "WhatsappAutomationKind" NOT NULL,
  "status" "WhatsappAutomationStatus" NOT NULL DEFAULT 'ACTIVE',
  "targetGroupJid" TEXT,
  "scheduledFor" TIMESTAMP(3),
  "timeOfDay" TEXT,
  "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "dayOfMonth" INTEGER,
  "monthDay" TEXT,
  "recurrenceTimeZone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "lastStatus" "WhatsappDispatchStatus",
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappAutomation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WhatsappAutomation_status_nextRunAt_idx" ON "WhatsappAutomation"("status", "nextRunAt");
CREATE INDEX "WhatsappAutomation_connectionId_status_idx" ON "WhatsappAutomation"("connectionId", "status");

CREATE TABLE "WhatsappDispatchLog" (
  "id" TEXT NOT NULL,
  "automationId" TEXT,
  "connectionId" TEXT NOT NULL,
  "dispatchKey" TEXT NOT NULL,
  "targetGroupJid" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "WhatsappDispatchStatus" NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "scheduledFor" TIMESTAMP(3),
  "triggeredBy" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappDispatchLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsappDispatchLog_dispatchKey_key" ON "WhatsappDispatchLog"("dispatchKey");
CREATE INDEX "WhatsappDispatchLog_connectionId_createdAt_idx" ON "WhatsappDispatchLog"("connectionId", "createdAt");
CREATE INDEX "WhatsappDispatchLog_automationId_createdAt_idx" ON "WhatsappDispatchLog"("automationId", "createdAt");

ALTER TABLE "WhatsappAutomation" ADD CONSTRAINT "WhatsappAutomation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsappConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsappDispatchLog" ADD CONSTRAINT "WhatsappDispatchLog_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "WhatsappAutomation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsappDispatchLog" ADD CONSTRAINT "WhatsappDispatchLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "WhatsappConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
