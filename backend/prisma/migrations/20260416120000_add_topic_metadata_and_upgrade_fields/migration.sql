-- Add topic extraction + upgrade-flow fields to documents

ALTER TABLE "documents"
  ADD COLUMN "topic_metadata" JSONB,
  ADD COLUMN "metadata_extracted_at" TIMESTAMP(3),
  ADD COLUMN "processed_tier" "UserTier",
  ADD COLUMN "reprocessing_at" TIMESTAMP(3);

-- Backfill processed_tier for existing documents: use the owner's current tier.
UPDATE "documents" d
SET "processed_tier" = u."tier"
FROM "users" u
WHERE d."user_id" = u."id"
  AND d."processed_tier" IS NULL;
