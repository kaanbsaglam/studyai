-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('TEXT_ONLY', 'VISION');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "extraction_method" "ExtractionMethod";
