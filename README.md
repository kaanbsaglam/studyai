# StudyAI

An LLM-powered study platform with RAG-based document chat, flashcard/quiz generation, and productivity tools.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   Express   │────▶│  PostgreSQL │
│  Frontend   │     │    API      │     │  (Prisma)   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
              ┌─────────┐ ┌─────────┐
              │  Redis  │ │   S3    │
              │(Cache + │ │ (Files) │
              │ Queue)  │ └─────────┘
              └────┬────┘
                   │
              ┌────▼────┐     ┌─────────┐
              │ Worker  │────▶│Pinecone │
              │(BullMQ) │     │(Vectors)│
              └─────────┘     └─────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- AWS account (for S3)
- Pinecone account
- Google AI Studio account (for Gemini API key)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd studyai
   cd backend && npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start databases:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations:**
   ```bash
   cd backend
   npm run db:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **In a separate terminal, start the worker (when implemented):**
   ```bash
   npm run dev:worker
   ```

### Verify Setup

- API: http://localhost:3000/api/v1
- Health check: http://localhost:3000/health

## Project Structure

```
studyai/
├── docker-compose.yml        # Local dev services
├── backend/
│   ├── src/
│   │   ├── index.js          # API server entry
│   │   ├── worker.js         # Background worker entry
│   │   ├── config/           # Environment & logger
│   │   ├── routes/           # Express route definitions
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── jobs/             # BullMQ job processors
│   │   ├── queues/           # Queue definitions
│   │   ├── lib/              # External service clients
│   │   ├── middleware/       # Express middleware
│   │   └── utils/            # Helper functions
│   └── prisma/
│       └── schema.prisma     # Database schema
└── frontend/                 # React app (separate)
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API server with hot reload |
| `npm run dev:worker` | Start background worker with hot reload |
| `npm run db:migrate` | Create and run migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## Tech Stack

- **Backend:** Node.js, Express, Prisma
- **Database:** PostgreSQL
- **Cache/Queue:** Redis, BullMQ
- **Vector DB:** Pinecone
- **Storage:** AWS S3
- **AI:** Google Gemini
- **Frontend:** React, Vite, TailwindCSS
