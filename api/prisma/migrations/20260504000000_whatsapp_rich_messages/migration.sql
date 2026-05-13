ALTER TABLE "WhatsappAutomation"
ADD COLUMN "imageBase64" TEXT,
ADD COLUMN "imageMimeType" TEXT,
ADD COLUMN "imageFileName" TEXT,
ADD COLUMN "mentionJids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
