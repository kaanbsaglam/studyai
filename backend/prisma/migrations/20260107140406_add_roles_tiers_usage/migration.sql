-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "tier" "UserTier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "daily_usage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "chat_messages" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "daily_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_usage_user_id_date_key" ON "daily_usage"("user_id", "date");

-- AddForeignKey
ALTER TABLE "daily_usage" ADD CONSTRAINT "daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
