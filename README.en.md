<div align="center">

# r-A-s-I-s(rss & ia)

**Smart RSS aggregator with AI-powered curation**

Collects news from multiple sources, removes duplicates, generates summaries in Spanish, and publishes a ready-to-consume `rss.xml` feed.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** | [Español](README.md) | [日本語](README.ja.md) | [Català](README.ca.md) | [Euskara](README.eu.md) | [Andaluz](README.an.md) | [Galego](README.gl.md)

</div>

---

## How it works

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  RSS Sources │────▶│  Normalize   │────▶│  Deduplicate │────▶│  Curate (AI)│
│  (BBC, NYT…) │     │  + extract   │     │  batch +     │     │  summarize +│
│              │     │  content     │     │  historical  │     │  classify   │
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  persistence │
                    └─────────────┘     └──────────────┘
```

1. **Collection** — fetches articles from sources configured in `src/config/sources.ts`
2. **Normalization** — extracts and sanitizes HTML content; enriches from the original article if insufficient
3. **Deduplication** — removes duplicates within the current batch and against previous runs (text similarity)
4. **AI Curation** — generates a Spanish summary and up to 4 tags per article using any OpenAI-compatible API
5. **Publishing** — serves the RSS feed at `/rss.xml` and a health-check at `/health`

## Key features

- **Refresh job** runnable every 15 min (`npm run refresh`)
- **Lightweight HTTP server** with `GET /health` and `GET /rss.xml`
- **PostgreSQL persistence** — schema auto-generated on startup
- **Decoupled LLM provider** — compatible with OpenAI, Anthropic, Ollama or any OpenAI-compatible API
- **AI-free fallback** — if no API key is set, generates extractive summaries so publishing never breaks
- **Smart deduplication** — per-batch and against history, based on text similarity
- **Source weighting** — prioritizes higher-relevance sources in the final feed
- **Zod validation** — all configuration is validated at startup

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/your-username/rssai.git
cd rssai
npm install

# 2. Set up environment variables
cp .env.example .env   # edit with your values

# 3. Run tests
npm test

# 4. Start in development mode
npm run dev             # server with hot-reload

# 5. In another terminal, trigger a refresh
npm run refresh
```

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | *(required)* |
| `APP_BASE_URL` | Public URL of the service | `http://localhost:3000` |
| `PORT` | HTTP server port | `3000` |
| `FEED_TITLE` | RSS feed title | `RSSAI` |
| `FEED_DESCRIPTION` | Feed description | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | Feed language | `es` |
| `FEED_MAX_ITEMS` | Max articles in the feed | `50` |
| `FETCH_TIMEOUT_MS` | Fetch timeout per source (ms) | `10000` |
| `LLM_PROVIDER` | LLM provider | `openai-compatible` |
| `LLM_BASE_URL` | LLM API base URL | `https://api.openai.com/v1` |
| `LLM_API_KEY` | LLM provider API key | *(optional — uses fallback without it)* |
| `LLM_MODEL` | Model to use | `gpt-4.1-mini` |

> If `LLM_API_KEY` is not set, the system uses an extractive fallback that doesn't require AI.

## Project structure

```
src/
├── config/
│   ├── env.ts              # Env var validation with Zod
│   └── sources.ts          # Configured RSS sources
├── db/
│   ├── database.ts         # PostgreSQL connection
│   └── repository.ts       # Queries and schema
├── feeds/
│   ├── feed-fetcher.ts     # Feed download and parsing
│   └── article-extractor.ts # Content enrichment
├── llm/
│   ├── provider.ts         # LlmProvider interface
│   ├── openai-compatible-provider.ts  # OpenAI implementation
│   └── factory.ts          # Provider factory
├── rss/
│   └── render-rss.ts       # RSS XML generation
├── services/
│   └── curation-service.ts # Pipeline orchestration
├── utils/
│   ├── dedupe.ts           # Similarity-based deduplication
│   ├── html.ts             # HTML sanitization
│   └── text.ts             # Text utilities
├── app.ts                  # HTTP handler
├── server.ts               # Server entry point
└── bin/
    └── refresh.ts          # Refresh script (cron)
```

## Deployment

The architecture consists of two processes:

| Process | Command | Description |
|---|---|---|
| **Web server** | `npm start` | Serves `/rss.xml` and `/health` |
| **Refresh cron** | `npm run refresh` | Run every 15 min |

Both share the same database and environment variables.

### Docker Compose example

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: rssai
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  web:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

  refresh:
    build: .
    command: npm run refresh
    # run with external cron or restart policy
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## Available scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Development server with hot-reload |
| `npm run refresh` | Run a refresh cycle |
| `npm start` | Production server |
| `npm test` | Run tests with Vitest |

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push: `git push origin my-feature`
5. Open a Pull Request

## License

This project is licensed under the [MIT](LICENSE) license.
