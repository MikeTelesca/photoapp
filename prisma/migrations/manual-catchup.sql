-- =============================================================================
-- MANUAL CATCH-UP MIGRATION
-- Generated: 2026-04-14
-- Purpose: Bring Neon Postgres prod DB in sync with prisma/schema.prisma
--
-- This file is IDEMPOTENT — safe to run more than once.
-- It uses CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS throughout.
--
-- Run order matters: User → Client → Job → Photo → PhotoComment → JobTemplate
--                    → Preset → Invite → ActivityLog → ErrorLog
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SCHEMA
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "public";

-- ---------------------------------------------------------------------------
-- Wave 1: User table (core auth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
    "id"                  TEXT NOT NULL,
    "name"                TEXT NOT NULL,
    "email"               TEXT NOT NULL,
    "password"            TEXT NOT NULL,
    "role"                TEXT NOT NULL DEFAULT 'photographer',
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl"           TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthlyAiCostLimit"  DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotifications"  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessName"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessEmail"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessPhone"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessAddress"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invoiceRate"         DOUBLE PRECISION DEFAULT 50;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invoicePrefix"       TEXT DEFAULT 'INV';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invoiceCounter"      INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "slackWebhookUrl"     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- ---------------------------------------------------------------------------
-- Wave 10+: Client table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Client" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "email"     TEXT,
    "phone"     TEXT,
    "company"   TEXT,
    "notes"     TEXT,
    "ownerId"   TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Client_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Client_ownerId_idx" ON "Client"("ownerId");

-- ---------------------------------------------------------------------------
-- Wave 1: Job table (core)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Job" (
    "id"              TEXT NOT NULL,
    "address"         TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "totalPhotos"     INTEGER NOT NULL DEFAULT 0,
    "processedPhotos" INTEGER NOT NULL DEFAULT 0,
    "approvedPhotos"  INTEGER NOT NULL DEFAULT 0,
    "rejectedPhotos"  INTEGER NOT NULL DEFAULT 0,
    "cost"            DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photographerId"  TEXT NOT NULL,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Job_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Wave 2+: Dropbox integration
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "dropboxUrl"         TEXT;

-- Wave 3+: Preset selector
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "preset"             TEXT NOT NULL DEFAULT 'standard';

-- Wave 4+: Notes
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "notes"              TEXT;

-- Wave 5+: Twilight tracking
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "twilightCount"      INTEGER NOT NULL DEFAULT 0;

-- Wave 6+: Watermark settings
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "watermarkText"      TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "watermarkPosition"  TEXT NOT NULL DEFAULT 'bottom-right';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "watermarkSize"      INTEGER NOT NULL DEFAULT 32;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "watermarkOpacity"   DOUBLE PRECISION NOT NULL DEFAULT 0.7;

-- Wave 7+: Tags
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "tags"               TEXT NOT NULL DEFAULT '';

-- Wave 8+: Client linkage (denormalized name + FK)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "clientName"         TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "clientId"           TEXT;

-- Wave 9+: Share / gallery link
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "shareToken"         TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "shareEnabled"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "listingDescription" TEXT;

-- Wave 11+: TV screen style
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "tvStyle"            TEXT NOT NULL DEFAULT 'netflix';

-- Wave 12+: Sky style
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "skyStyle"           TEXT NOT NULL DEFAULT 'blue-clouds';

-- Add clientId FK now that Client table exists (safe to run; constraint name is stable)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Job_clientId_fkey'
          AND table_name = 'Job'
    ) THEN
        ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Job_shareToken_key"              ON "Job"("shareToken");
CREATE INDEX       IF NOT EXISTS "Job_photographerId_createdAt_idx" ON "Job"("photographerId", "createdAt" DESC);
CREATE INDEX       IF NOT EXISTS "Job_status_idx"                   ON "Job"("status");

-- ---------------------------------------------------------------------------
-- Wave 1: Photo table (core)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Photo" (
    "id"          TEXT NOT NULL,
    "jobId"       TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "originalUrl" TEXT,
    "editedUrl"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Photo_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "orderIndex"           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "thumbnailUrl"         TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "isExterior"           BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "isTwilight"           BOOLEAN NOT NULL DEFAULT false;

-- Wave 5+: Twilight instructions
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "twilightInstructions" TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "twilightStyle"        TEXT;

-- Wave 6+: Custom instructions
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "customInstructions"   TEXT;

-- Wave 7+: AI detections (JSON)
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "detections"           TEXT NOT NULL DEFAULT '[]';

-- Wave 8+: Bracket / EXIF metadata
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "bracketGroup"         INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "bracketIndex"         INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "exifData"             TEXT;

-- Wave 9+: File metadata
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "fileSizeBytes"        INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "widthPx"              INTEGER;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "heightPx"             INTEGER;

-- Wave 10+: Error tracking
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "errorMessage"         TEXT;
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "errorAttempts"        INTEGER NOT NULL DEFAULT 0;

-- Wave 12+: Quality flags (JSON blob)
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "qualityFlags"         TEXT;

-- Wave 13+: Rejection reason
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "rejectionReason"      TEXT;

-- Wave 15+: isFavorite
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "isFavorite"           BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Photo_jobId_status_idx"     ON "Photo"("jobId", "status");
CREATE INDEX IF NOT EXISTS "Photo_jobId_orderIndex_idx" ON "Photo"("jobId", "orderIndex");

-- ---------------------------------------------------------------------------
-- Wave 19+: PhotoComment table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PhotoComment" (
    "id"         TEXT NOT NULL,
    "photoId"    TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "message"    TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PhotoComment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PhotoComment_photoId_idx" ON "PhotoComment"("photoId");

-- ---------------------------------------------------------------------------
-- Wave 14+: JobTemplate table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "JobTemplate" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "ownerId"         TEXT NOT NULL,
    "preset"          TEXT NOT NULL DEFAULT 'standard',
    "tvStyle"         TEXT,
    "skyStyle"        TEXT,
    "watermarkText"   TEXT,
    "photographerName" TEXT,
    "clientName"      TEXT,
    "tags"            TEXT,
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "JobTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "JobTemplate_ownerId_idx" ON "JobTemplate"("ownerId");

-- ---------------------------------------------------------------------------
-- Wave 3+: Preset table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Preset" (
    "id"              TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "description"     TEXT NOT NULL DEFAULT '',
    "promptModifiers" TEXT NOT NULL DEFAULT '',
    "isDefault"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Preset_slug_key" ON "Preset"("slug");

-- ---------------------------------------------------------------------------
-- Wave 4+: Invite table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Invite" (
    "id"          TEXT NOT NULL,
    "token"       TEXT NOT NULL,
    "email"       TEXT,
    "role"        TEXT NOT NULL DEFAULT 'photographer',
    "createdById" TEXT NOT NULL,
    "usedAt"      TIMESTAMP(3),
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");
CREATE INDEX       IF NOT EXISTS "Invite_token_idx"  ON "Invite"("token");

-- ---------------------------------------------------------------------------
-- Wave 6+: ActivityLog table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id"        TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "jobId"     TEXT,
    "photoId"   TEXT,
    "userId"    TEXT,
    "metadata"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ActivityLog_jobId_idx"     ON "ActivityLog"("jobId");

-- ---------------------------------------------------------------------------
-- Wave 16+: ErrorLog table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ErrorLog" (
    "id"        TEXT NOT NULL,
    "source"    TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "jobId"     TEXT,
    "photoId"   TEXT,
    "userId"    TEXT,
    "metadata"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErrorLog_source_createdAt_idx" ON "ErrorLog"("source", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ErrorLog_jobId_idx"            ON "ErrorLog"("jobId");

-- ---------------------------------------------------------------------------
-- Portfolio: public photographer portfolio page fields on User
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "portfolioSlug"    TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "portfolioEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "portfolioBio"     TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_portfolioSlug_key" ON "User"("portfolioSlug");

-- ---------------------------------------------------------------------------
-- Per-status quick note snippets: JSON-encoded map of status -> string[]
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusSnippets" TEXT;

-- =============================================================================
-- END OF MANUAL CATCH-UP MIGRATION
-- =============================================================================
