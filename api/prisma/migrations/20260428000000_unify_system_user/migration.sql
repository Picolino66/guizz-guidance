-- Unificar Admin e RhUser em SystemUser com SystemRole

-- 1. Criar novo enum SystemRole com valor ADMIN adicional
CREATE TYPE "SystemRole" AS ENUM ('ADMIN', 'RH', 'TECH');

-- 2. Renomear tabela RhUser → SystemUser
ALTER TABLE "RhUser" RENAME TO "SystemUser";

-- 3. Converter coluna role para o novo enum
ALTER TABLE "SystemUser"
  ALTER COLUMN "role" TYPE "SystemRole"
  USING "role"::text::"SystemRole";

-- 4. Tornar coluna name nullable (admins não têm name)
ALTER TABLE "SystemUser"
  ALTER COLUMN "name" DROP NOT NULL;

-- 5. Adicionar coluna username (nullable, para compatibilidade com login de admin)
ALTER TABLE "SystemUser" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "SystemUser_username_key" ON "SystemUser"("username");

-- 6. Inserir registros de Admin na tabela SystemUser com role ADMIN
INSERT INTO "SystemUser" ("id", "name", "username", "email", "role", "passwordHash", "createdAt")
SELECT
  id,
  NULL,
  username,
  email,
  'ADMIN'::"SystemRole",
  "passwordHash",
  "createdAt"
FROM "Admin"
ON CONFLICT ("email") DO NOTHING;

-- 7. Renomear índices para refletir a nova tabela
ALTER INDEX "RhUser_email_key" RENAME TO "SystemUser_email_key";

-- 8. Remover enum antigo
DROP TYPE "RhUserRole";

-- 9. Remover tabela Admin (dados já migrados)
DROP TABLE "Admin";
