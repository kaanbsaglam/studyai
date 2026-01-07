/*
  Warnings:

  - You are about to drop the column `chat_messages` on the `daily_usage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_usage" DROP COLUMN "chat_messages",
ADD COLUMN     "tokens_used" INTEGER NOT NULL DEFAULT 0;
