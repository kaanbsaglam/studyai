-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DOCUMENT', 'CHAT', 'FLASHCARDS', 'QUIZ', 'SUMMARY', 'NOTES');

-- AlterTable
ALTER TABLE "study_sessions" ADD COLUMN     "activity_type" "ActivityType" NOT NULL DEFAULT 'DOCUMENT';
