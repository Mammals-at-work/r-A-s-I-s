<div align="center">

# r-A-s-I-s(rss & ia)

**Agregaó RSS inteligente con curaó automático por IA**

Recoge notisia de un montón de fuente, quita lo duplicao, genera resúmene en castellano y publica un feed `rss.xml` listo pa consumí.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.en.md) | [Español](README.md) | [日本語](README.ja.md) | [Català](README.ca.md) | [Euskara](README.eu.md) | **Andaluz** | [Galego](README.gl.md)

</div>

---

## Cómo funciona

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Fuente RSS  │────▶│  Normalisá   │────▶│  Deduplicá   │────▶│  Curá (IA)  │
│  (BBC, NYT…) │     │  + sacá er   │     │  por lote +  │     │  resumí +   │
│              │     │  contenío    │     │  histórico   │     │  clasifisá  │
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  persistensia│
                    └─────────────┘     └──────────────┘
```

1. **Recogía** — pilla artículo de la fuente configurá en `src/config/sources.ts`
2. **Normalisasión** — saca y limpia er contenío HTML; si no es bastante, lo enriquese desde er artículo originá
3. **Deduplicasión** — quita lo duplicao dentro der lote actuá y contra ejecusione anteriore (similitud de texto)
4. **Curaó con IA** — genera un resumen en castellano y hasta 4 etiqueta por artículo usando cuarquier API compatible con OpenAI
5. **Publicasión** — sirve er feed RSS en `/rss.xml` y un health-check en `/health`

## Característica principale

- **Job de refresco** que se ejecuta cada 15 min (`npm run refresh`)
- **Servidó HTTP** ligerito con `GET /health` y `GET /rss.xml`
- **Persistensia en PostgreSQL** — er esquema se genera solo ar arrancá
- **Proveedor LLM desacoplao** — compatible con OpenAI, Anthropic, Ollama o cuarquier API OpenAI-compatible
- **Fallback sin IA** — si no hay API key, genera resúmene extractivo pa que no se rompa la publicasión
- **Deduplicasión inteligente** — por lote y contra er histórico, basá en similitud de texto
- **Peso por fuente** — le da prioridá a la fuente má importante en er feed finá
- **Validasión con Zod** — toa la configurasión se valida ar arrancá

## Empiesa rápido

```bash
# 1. Cloná e instalá
git clone https://github.com/tu-usuario/rssai.git
cd rssai
npm install

# 2. Configurá la variable de entorno
cp .env.example .env   # editá con tu valore

# 3. Correlo test
npm test

# 4. Arrancá en desarroyo
npm run dev             # servidó con hot-reload

# 5. En otra terminá, lansa un refresco
npm run refresh
```

## Variable de entorno

| Variable | Descripsión | Való por defecto |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | *(obligatorio)* |
| `APP_BASE_URL` | URL pública der servisio | `http://localhost:3000` |
| `PORT` | Puerto der servidó HTTP | `3000` |
| `FEED_TITLE` | Título der feed RSS | `RSSAI` |
| `FEED_DESCRIPTION` | Descripsión der feed | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | Idioma der feed | `es` |
| `FEED_MAX_ITEMS` | Máximo de artículo en er feed | `50` |
| `FETCH_TIMEOUT_MS` | Timeout de fetch por fuente (ms) | `10000` |
| `LLM_PROVIDER` | Proveedor LLM | `openai-compatible` |
| `LLM_BASE_URL` | Base URL de la API LLM | `https://api.openai.com/v1` |
| `LLM_API_KEY` | API key der proveedor LLM | *(opcioá — sin eya usa fallback)* |
| `LLM_MODEL` | Modelo a usá | `gpt-4.1-mini` |

> Si `LLM_API_KEY` no está configurá, er sistema usa un fallback extractivo que no nesesita IA.

## Estructura der proyecto

```
src/
├── config/
│   ├── env.ts              # Validasión de variable de entorno con Zod
│   └── sources.ts          # Fuente RSS configurá
├── db/
│   ├── database.ts         # Conexión a PostgreSQL
│   └── repository.ts       # Consulta y esquema
├── feeds/
│   ├── feed-fetcher.ts     # Descarga y parseo de feed
│   └── article-extractor.ts # Enriquesimiento de contenío
├── llm/
│   ├── provider.ts         # Interfá LlmProvider
│   ├── openai-compatible-provider.ts  # Implementasión OpenAI
│   └── factory.ts          # Factoría de proveedore
├── rss/
│   └── render-rss.ts       # Generasión der XML RSS
├── services/
│   └── curation-service.ts # Orquestasión der pipeline
├── utils/
│   ├── dedupe.ts           # Deduplicasión por similitud
│   ├── html.ts             # Sanitisasión HTML
│   └── text.ts             # Utilidade de texto
├── app.ts                  # Handler HTTP
├── server.ts               # Punto de entrada der servidó
└── bin/
    └── refresh.ts          # Script de refresco (cron)
```

## Despliegue

La arquitectura se compone de do proseso:

| Proseso | Comando | Descripsión |
|---|---|---|
| **Servidó web** | `npm start` | Sirve `/rss.xml` y `/health` |
| **Cron de refresco** | `npm run refresh` | Ejecutá cada 15 min |

Lo do comparten la misma base de dato y la misma variable de entorno.

### Ejemplo con Docker Compose

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
    # ejecutá con cron externo o restart policy
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## Script disponible

| Script | Descripsión |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run dev` | Servidó en desarroyo con hot-reload |
| `npm run refresh` | Ejecuta un siclo de refresco |
| `npm start` | Servidó en produksión |
| `npm test` | Ejecuta lo test con Vitest |

## Contribuí

1. Hasle un fork ar repositorio
2. Crea una rama: `git checkout -b mi-mejora`
3. Has commit: `git commit -m "Añadí mi mejora"`
4. Push: `git push origin mi-mejora`
5. Abre un Pull Request

## Lisensia

Este proyecto está bajo la lisensia [MIT](LICENSE).
