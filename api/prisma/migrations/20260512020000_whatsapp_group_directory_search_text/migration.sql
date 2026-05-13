ALTER TABLE "Contact"
ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

UPDATE "Contact"
SET "searchText" = trim(
  regexp_replace(
    translate(
      lower(
        concat_ws(
          ' ',
          coalesce("name", ''),
          coalesce("email", ''),
          coalesce("phoneNumber", '')
        )
      ),
      'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
      'aaaaaaeeeeiiiiooooouuuucnyy'
    ),
    '\s+',
    ' ',
    'g'
  )
);

CREATE INDEX "Contact_searchText_idx" ON "Contact"("searchText");

CREATE TABLE "WhatsappGroup" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "jid" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "searchText" TEXT NOT NULL DEFAULT '',
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappGroup_connectionId_jid_key" ON "WhatsappGroup"("connectionId", "jid");
CREATE INDEX "WhatsappGroup_connectionId_isAvailable_name_idx" ON "WhatsappGroup"("connectionId", "isAvailable", "name");
CREATE INDEX "WhatsappGroup_searchText_idx" ON "WhatsappGroup"("searchText");

ALTER TABLE "WhatsappGroup"
ADD CONSTRAINT "WhatsappGroup_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "WhatsappConnection"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
