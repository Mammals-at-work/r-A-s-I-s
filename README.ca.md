<div align="center">

# r-A-s-I-s(rss & ia)

**Agregador RSS intel-ligent amb curació automàtica per IA**

Recull notícies de múltiples fonts, elimina duplicats, genera resums en castellà i publica un feed `rss.xml` llest per consumir.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.en.md) | [Español](README.md) | [日本語](README.ja.md) | **Català** | [Euskara](README.eu.md) | [Andaluz](README.an.md) | [Galego](README.gl.md)

</div>

---

## Com funciona

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Fonts RSS   │────▶│  Normalitzar │────▶│  Deduplicar  │────▶│  Curar (IA) │
│  (BBC, NYT…) │     │  + extreure  │     │  per lot +   │     │  resumir +  │
│              │     │  contingut   │     │  històric    │     │  classificar│
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  persistència│
                    └─────────────┘     └──────────────┘
```

1. **Recollida** — obté articles de les fonts configurades a `src/config/sources.ts`
2. **Normalització** — extreu i neteja el contingut HTML; si és insuficient, enriqueix des de l'article original
3. **Deduplicació** — elimina duplicats dins del lot actual i contra execucions prèvies (similitud de text)
4. **Curació amb IA** — genera un resum en castellà i fins a 4 etiquetes per article usant qualsevol API compatible amb OpenAI
5. **Publicació** — serveix el feed RSS a `/rss.xml` i un health-check a `/health`

## Característiques principals

- **Job de refresc** executable cada 15 min (`npm run refresh`)
- **Servidor HTTP** lleuger amb `GET /health` i `GET /rss.xml`
- **Persistència en PostgreSQL** — esquema autogenerat en arrencar
- **Proveïdor LLM desacoblat** — compatible amb OpenAI, Anthropic, Ollama o qualsevol API OpenAI-compatible
- **Fallback sense IA** — si no hi ha API key, genera resums extractius per no trencar la publicació
- **Deduplicació intel·ligent** — per lot i contra l'històric, basada en similitud textual
- **Pesos per font** — prioritza fonts de major rellevància al feed final
- **Validació amb Zod** — tota la configuració es valida en arrencar

## Inici ràpid

```bash
# 1. Clonar i instal·lar
git clone https://github.com/el-teu-usuari/rssai.git
cd rssai
npm install

# 2. Configurar variables d'entorn
cp .env.example .env   # editar amb els teus valors

# 3. Executar tests
npm test

# 4. Iniciar en desenvolupament
npm run dev             # servidor amb hot-reload

# 5. En una altra terminal, llançar un refresc
npm run refresh
```

## Variables d'entorn

| Variable | Descripció | Valor per defecte |
|---|---|---|
| `DATABASE_URL` | Cadena de connexió a PostgreSQL | *(obligatori)* |
| `APP_BASE_URL` | URL pública del servei | `http://localhost:3000` |
| `PORT` | Port del servidor HTTP | `3000` |
| `FEED_TITLE` | Títol del feed RSS | `RSSAI` |
| `FEED_DESCRIPTION` | Descripció del feed | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | Idioma del feed | `es` |
| `FEED_MAX_ITEMS` | Màxim d'articles al feed | `50` |
| `FETCH_TIMEOUT_MS` | Timeout de fetch per font (ms) | `10000` |
| `LLM_PROVIDER` | Proveïdor LLM | `openai-compatible` |
| `LLM_BASE_URL` | Base URL de l'API LLM | `https://api.openai.com/v1` |
| `LLM_API_KEY` | API key del proveïdor LLM | *(opcional — sense ella usa fallback)* |
| `LLM_MODEL` | Model a utilitzar | `gpt-4.1-mini` |

> Si `LLM_API_KEY` no està configurada, el sistema usa un fallback extractiu que no requereix IA.

## Estructura del projecte

```
src/
├── config/
│   ├── env.ts              # Validació de variables d'entorn amb Zod
│   └── sources.ts          # Fonts RSS configurades
├── db/
│   ├── database.ts         # Connexió a PostgreSQL
│   └── repository.ts       # Consultes i esquema
├── feeds/
│   ├── feed-fetcher.ts     # Descàrrega i parseig de feeds
│   └── article-extractor.ts # Enriquiment de contingut
├── llm/
│   ├── provider.ts         # Interfície LlmProvider
│   ├── openai-compatible-provider.ts  # Implementació OpenAI
│   └── factory.ts          # Factoria de proveïdors
├── rss/
│   └── render-rss.ts       # Generació del XML RSS
├── services/
│   └── curation-service.ts # Orquestració del pipeline
├── utils/
│   ├── dedupe.ts           # Deduplicació per similitud
│   ├── html.ts             # Sanitització HTML
│   └── text.ts             # Utilitats de text
├── app.ts                  # Handler HTTP
├── server.ts               # Punt d'entrada del servidor
└── bin/
    └── refresh.ts          # Script de refresc (cron)
```

## Desplegament

L'arquitectura es compon de dos processos:

| Procés | Comanda | Descripció |
|---|---|---|
| **Servidor web** | `npm start` | Serveix `/rss.xml` i `/health` |
| **Cron de refresc** | `npm run refresh` | Executar cada 15 min |

Ambdós comparteixen la mateixa base de dades i les mateixes variables d'entorn.

### Exemple amb Docker Compose

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
    # executar amb cron extern o restart policy
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## Scripts disponibles

| Script | Descripció |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run dev` | Servidor en desenvolupament amb hot-reload |
| `npm run refresh` | Executa un cicle de refresc |
| `npm start` | Servidor en producció |
| `npm test` | Executa els tests amb Vitest |

## Contribuir

1. Fes un fork del repositori
2. Crea una branca: `git checkout -b la-meva-millora`
3. Fes commit: `git commit -m "Afegir la meva millora"`
4. Push: `git push origin la-meva-millora`
5. Obre un Pull Request

## Llicència

Aquest projecte està sota la llicència [MIT](LICENSE).
