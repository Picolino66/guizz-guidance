-- Persist Baileys auth state for the primary WhatsApp session

ALTER TABLE "WhatsappConnection" ADD COLUMN "session" JSONB;
