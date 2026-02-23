# StudyAI

A study platform where you upload your course materials and use AI to chat with them, generate flashcards, quizzes, and summaries.

## Overview

- **Document chat** — Upload PDFs, DOCX, TXT, or audio files. Ask questions and get answers grounded in your documents.
- **Flashcards & Quizzes** — Auto-generate study aids from your uploaded materials or from LLM's general knowledge.
- **Summaries** — Generate condensed versions of your documents at different lengths.
- **Notes** — Write markdown notes alongside your documents in a side-by-side view.
- **Study tracking** — Tracks time spent, streaks, and time-per-classroom stats. Displays activity heatmap.
- **Pomodoro timer** — Adjustable timer thats in the header, works across all pages.
- **Account tiers** — Free and premium tiers with different limits on storage, classrooms, and token usage.
- **i18n** — English and Turkish.
- **Themes** — Light, dark, system, and earth.

## Tech stack

**Backend:** Node.js, Express, Prisma (PostgreSQL), Redis + BullMQ for background jobs, Pinecone for vector search

**Frontend:** React 19, Vite, Tailwind CSS v4, react-pdf, react-markdown

**AI:** Google Gemini (text generation + embeddings), OpenAI Whisper (audio transcription, premium only), Gemini Vision (PDF image extraction, premium only)

**Infrastructure:** Docker Compose, AWS S3 for file storage

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- AWS account (S3)
- Pinecone account
- Google AI Studio API key (Gemini)
- OpenAI API key (for Whisper audio transcription)

## Setup

```bash
git clone https://github.com/kaanbsaglam/studyai
cd studyai

# Start Postgres and Redis
docker-compose up -d postgres redis

# Backend
cd backend
npm install
cp .env.example .env   # fill in your API keys
npm run db:migrate
npm run dev

# Worker 
npm run worker:dev

# Frontend 
cd ../frontend
npm install
npm run dev
```

Or run everything in Docker:

```bash
docker-compose up -d
```

The API runs on `http://localhost:3000`, the frontend on `http://localhost:5173`.

## Environment variables

The backend needs these in `backend/.env`:

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Secret for signing JWTs
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` — S3 config
- `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` — Pinecone config
- `GEMINI_API_KEY` — Google Gemini API key
- `OPENAI_WHISPER_SECRET_KEY` — OpenAI key for Whisper transcription

See `.env.example` for the full list.


## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the API server (backend) |
| `npm run worker:dev` | Start the background worker |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Lint backend code |
| `npm test` | Run tests |
