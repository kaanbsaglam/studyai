-- CreateTable
CREATE TABLE "study_sessions" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "classroom_name" TEXT NOT NULL,
    "document_name" TEXT,
    "user_id" TEXT NOT NULL,
    "classroom_id" TEXT,
    "document_id" TEXT,

    CONSTRAINT "study_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_sessions_user_id_started_at_idx" ON "study_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "study_sessions_classroom_id_started_at_idx" ON "study_sessions"("classroom_id", "started_at");

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
