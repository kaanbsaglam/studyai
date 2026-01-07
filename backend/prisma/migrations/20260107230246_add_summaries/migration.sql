-- CreateTable
CREATE TABLE "summaries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "focus_topic" TEXT,
    "content" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "summaries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
