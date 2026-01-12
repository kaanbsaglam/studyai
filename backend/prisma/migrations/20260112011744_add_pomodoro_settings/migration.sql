-- CreateTable
CREATE TABLE "pomodoro_settings" (
    "id" TEXT NOT NULL,
    "focus_duration" INTEGER NOT NULL DEFAULT 25,
    "short_break_duration" INTEGER NOT NULL DEFAULT 5,
    "long_break_duration" INTEGER NOT NULL DEFAULT 15,
    "sessions_before_long" INTEGER NOT NULL DEFAULT 4,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_start_breaks" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "pomodoro_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pomodoro_settings_user_id_key" ON "pomodoro_settings"("user_id");

-- AddForeignKey
ALTER TABLE "pomodoro_settings" ADD CONSTRAINT "pomodoro_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
