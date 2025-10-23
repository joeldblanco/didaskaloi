-- Migration: Remove accessCode and password from Project, add password to InviteCode
-- Run this manually: psql $DATABASE_URL -f prisma/migrations/manual_migration.sql

-- Add password column to invite_codes (nullable for VIEWER codes)
ALTER TABLE "invite_codes" ADD COLUMN "password" TEXT;

-- Remove accessCode and password columns from projects
-- First, let's check if there are any projects (there shouldn't be any according to user)
-- If there are, this will fail. In that case, backup first.

ALTER TABLE "projects" DROP COLUMN IF EXISTS "accessCode";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "password";

-- Done!
-- After running this, run: npx prisma generate
