-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quiz_set_id" TEXT NOT NULL,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_set_id_fkey" FOREIGN KEY ("quiz_set_id") REFERENCES "quiz_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
