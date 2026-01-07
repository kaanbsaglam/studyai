-- CreateTable
CREATE TABLE "quiz_sets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "focus_topic" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "quiz_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "wrong_answers" TEXT[],
    "position" INTEGER NOT NULL,
    "quiz_set_id" TEXT NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quiz_sets" ADD CONSTRAINT "quiz_sets_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sets" ADD CONSTRAINT "quiz_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_set_id_fkey" FOREIGN KEY ("quiz_set_id") REFERENCES "quiz_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
