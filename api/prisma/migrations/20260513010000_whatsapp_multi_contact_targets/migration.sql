ALTER TABLE "WhatsappAutomation"
ADD COLUMN "targetJids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "WhatsappAutomation"
SET "targetJids" = ARRAY["targetJid"]
WHERE "targetType" = 'CONTACT'
  AND "targetJid" IS NOT NULL
  AND cardinality("targetJids") = 0;
