<div align="center">

# r-A-s-I-s(rss & ia)

**Agregador RSS intelixente con curado automático por IA**

Recolle noticias de múltiples fontes, elimina duplicados, xera resumos en castelán e publica un feed `rss.xml` listo para consumir.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.en.md) | [Español](README.md) | [日本語](README.ja.md) | [Català](README.ca.md) | [Euskara](README.eu.md) | [Andaluz](README.an.md) | **Galego**

</div>

---

## Como funciona

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Fontes RSS  │────▶│  Normalizar  │────▶│  Deduplicar  │────▶│  Curar (IA) │
│  (BBC, NYT…) │     │  + extraer   │     │  por lote +  │     │  resumir +  │
│              │     │  contido     │     │  histórico   │     │  clasificar │
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  persistencia│
                    └─────────────┘     └──────────────┘
```

1. **Recollida** — obtén artigos das fontes configuradas en `src/config/sources.ts`
2. **Normalización** — extrae e limpa o contido HTML; se é insuficiente, enriquece desde o artigo orixinal
3. **Deduplicación** — elimina duplicados dentro do lote actual e contra execucións previas (similitude de texto)
4. **Curado con IA** — xera un resumo en castelán e ata 4 etiquetas por artigo usando calquera API compatible con OpenAI
5. **Publicación** — serve o feed RSS en `/rss.xml` e un health-check en `/health`

## Características principais

- **Job de refresco** executable cada 15 min (`npm run refresh`)
- **Servidor HTTP** lixeiro con `GET /health` e `GET /rss.xml`
- **Persistencia en PostgreSQL** — esquema autoxerado ao arrancar
- **Provedor LLM desacoplado** — compatible con OpenAI, Anthropic, Ollama ou calquera API OpenAI-compatible
- **Fallback sen IA** — se non hai API key, xera resumos extractivos para non romper a publicación
- **Deduplicación intelixente** — por lote e contra o histórico, baseada en similitude textual
- **Pesos por fonte** — prioriza fontes de maior relevancia no feed final
- **Validación con Zod** — toda a configuración valídase ao arrancar

## Inicio rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/o-teu-usuario/rssai.git
cd rssai
npm install

# 2. Configurar variables de contorno
cp .env.example .env   # editar cos teus valores

# 3. Executar tests
npm test

# 4. Iniciar en desenvolvemento
npm run dev             # servidor con hot-reload

# 5. Noutra terminal, lanzar un refresco
npm run refresh
```

## Variables de contorno

| Variable | Descrición | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | Cadea de conexión a PostgreSQL | *(obrigatorio)* |
| `APP_BASE_URL` | URL pública do servizo | `http://localhost:3000` |
| `PORT` | Porto do servidor HTTP | `3000` |
| `FEED_TITLE` | Título do feed RSS | `RSSAI` |
| `FEED_DESCRIPTION` | Descrición do feed | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | Idioma do feed | `es` |
| `FEED_MAX_ITEMS` | Máximo de artigos no feed | `50` |
| `FETCH_TIMEOUT_MS` | Timeout de fetch por fonte (ms) | `10000` |
| `LLM_PROVIDER` | Provedor LLM | `openai-compatible` |
| `LLM_BASE_URL` | Base URL da API LLM | `https://api.openai.com/v1` |
| `LLM_API_KEY` | API key do provedor LLM | *(opcional — sen ela usa fallback)* |
| `LLM_MODEL` | Modelo a utilizar | `gpt-4.1-mini` |

> Se `LLM_API_KEY` non está configurada, o sistema usa un fallback extractivo que non require IA.

## Estrutura do proxecto

```
src/
├── config/
│   ├── env.ts              # Validación de variables de contorno con Zod
│   └── sources.ts          # Fontes RSS configuradas
├── db/
│   ├── database.ts         # Conexión a PostgreSQL
│   └── repository.ts       # Consultas e esquema
├── feeds/
│   ├── feed-fetcher.ts     # Descarga e parseo de feeds
│   └── article-extractor.ts # Enriquecemento de contido
├── llm/
│   ├── provider.ts         # Interface LlmProvider
│   ├── openai-compatible-provider.ts  # Implementación OpenAI
│   └── factory.ts          # Factoría de provedores
├── rss/
│   └── render-rss.ts       # Xeración do XML RSS
├── services/
│   └── curation-service.ts # Orquestación do pipeline
├── utils/
│   ├── dedupe.ts           # Deduplicación por similitude
│   ├── html.ts             # Sanitización HTML
│   └── text.ts             # Utilidades de texto
├── app.ts                  # Handler HTTP
├── server.ts               # Punto de entrada do servidor
└── bin/
    └── refresh.ts          # Script de refresco (cron)
```

## Despregamento

A arquitectura componse de dous procesos:

| Proceso | Comando | Descrición |
|---|---|---|
| **Servidor web** | `npm start` | Serve `/rss.xml` e `/health` |
| **Cron de refresco** | `npm run refresh` | Executar cada 15 min |

Ambos comparten a mesma base de datos e as mesmas variables de contorno.

### Exemplo con Docker Compose

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
    # executar con cron externo ou restart policy
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## Scripts dispoñibles

| Script | Descrición |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run dev` | Servidor en desenvolvemento con hot-reload |
| `npm run refresh` | Executa un ciclo de refresco |
| `npm start` | Servidor en produción |
| `npm test` | Executa os tests con Vitest |

## Contribuír

1. Fai un fork do repositorio
2. Crea unha rama: `git checkout -b a-miña-mellora`
3. Fai commit: `git commit -m "Engadir a miña mellora"`
4. Push: `git push origin a-miña-mellora`
5. Abre un Pull Request

## Licenza

Este proxecto está baixo a licenza [MIT](LICENSE).
