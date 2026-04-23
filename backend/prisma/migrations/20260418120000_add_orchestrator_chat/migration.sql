-- CreateTable
CREATE TABLE "orchestrator_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "classroom_id" TEXT NOT NULL,

    CONSTRAINT "orchestrator_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orchestrator_messages" (
    "id" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "planning_trace" JSONB,
    "stage_tokens" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,

    CONSTRAINT "orchestrator_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable (M2M: OrchestratorSession <-> Document)
CREATE TABLE "_OrchestratorSessionDocuments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "orchestrator_sessions_classroom_id_updated_at_idx" ON "orchestrator_sessions"("classroom_id", "updated_at");

-- CreateIndex
CREATE INDEX "orchestrator_sessions_user_id_idx" ON "orchestrator_sessions"("user_id");

-- CreateIndex
CREATE INDEX "orchestrator_messages_session_id_created_at_idx" ON "orchestrator_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "_OrchestratorSessionDocuments_AB_unique" ON "_OrchestratorSessionDocuments"("A", "B");

-- CreateIndex
CREATE INDEX "_OrchestratorSessionDocuments_B_index" ON "_OrchestratorSessionDocuments"("B");

-- AddForeignKey
ALTER TABLE "orchestrator_sessions" ADD CONSTRAINT "orchestrator_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orchestrator_sessions" ADD CONSTRAINT "orchestrator_sessions_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orchestrator_messages" ADD CONSTRAINT "orchestrator_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "orchestrator_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (M2M)
ALTER TABLE "_OrchestratorSessionDocuments" ADD CONSTRAINT "_OrchestratorSessionDocuments_A_fkey" FOREIGN KEY ("A") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (M2M)
ALTER TABLE "_OrchestratorSessionDocuments" ADD CONSTRAINT "_OrchestratorSessionDocuments_B_fkey" FOREIGN KEY ("B") REFERENCES "orchestrator_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
