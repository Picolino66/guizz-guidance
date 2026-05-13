CREATE TYPE "WhatsappAutomationTargetType" AS ENUM ('GROUP', 'CONTACT');

ALTER TABLE "WhatsappAutomation"
  ADD COLUMN "targetType" "WhatsappAutomationTargetType",
  ADD COLUMN "targetJid" TEXT;

UPDATE "WhatsappAutomation"
SET
  "targetType" = 'GROUP',
  "targetJid" = "targetGroupJid"
WHERE "targetGroupJid" IS NOT NULL;

UPDATE "WhatsappAutomation"
SET
  "status" = 'ARCHIVED',
  "lastStatus" = 'SKIPPED',
  "lastError" = COALESCE("lastError", 'Automação arquivada após remoção do grupo padrão da conexão.'),
  "nextRunAt" = NULL
WHERE "targetJid" IS NULL;

ALTER TABLE "WhatsappAutomation"
  DROP COLUMN "targetGroupJid";

ALTER TABLE "WhatsappDispatchLog"
  ADD COLUMN "targetType" "WhatsappAutomationTargetType" NOT NULL DEFAULT 'GROUP',
  ADD COLUMN "targetJid" TEXT;

UPDATE "WhatsappDispatchLog"
SET "targetJid" = "targetGroupJid";

ALTER TABLE "WhatsappDispatchLog"
  DROP COLUMN "targetGroupJid";

ALTER TABLE "WhatsappDispatchLog"
  ALTER COLUMN "targetJid" SET NOT NULL;

ALTER TABLE "WhatsappDispatchLog"
  ALTER COLUMN "targetType" DROP DEFAULT;

ALTER TABLE "WhatsappConnection"
  DROP COLUMN "groupName",
  DROP COLUMN "groupJid";
