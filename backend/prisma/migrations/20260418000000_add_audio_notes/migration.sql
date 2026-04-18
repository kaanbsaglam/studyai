-- AlterTable: add optional audio-file fields to notes
ALTER TABLE "notes" ADD COLUMN "mime_type" TEXT;
ALTER TABLE "notes" ADD COLUMN "s3_key" TEXT;
ALTER TABLE "notes" ADD COLUMN "original_name" TEXT;
ALTER TABLE "notes" ADD COLUMN "size" INTEGER;
