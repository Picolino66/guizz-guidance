-- Simplificar SystemRole para apenas ADMIN e USER
-- Registros com role RH ou TECH viram USER

-- 1. Converter coluna para TEXT para permitir troca de enum
ALTER TABLE "SystemUser" ALTER COLUMN "role" TYPE TEXT;

-- 2. Atualizar valores antigos RH e TECH para USER
UPDATE "SystemUser" SET "role" = 'USER' WHERE "role" IN ('RH', 'TECH');

-- 3. Remover enum antigo
DROP TYPE "SystemRole";

-- 4. Criar novo enum simplificado
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'USER');

-- 5. Converter coluna de volta para o novo enum
ALTER TABLE "SystemUser"
  ALTER COLUMN "role" TYPE "SystemRole"
  USING "role"::"SystemRole";
