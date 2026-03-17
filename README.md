<div align="center">

# r-A-s-I-s(rss & ia)

**Agregador RSS inteligente con curado automático por IA**

Recoge noticias de múltiples fuentes, elimina duplicados, genera resúmenes en español y publica un feed `rss.xml` listo para consumir.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.en.md) | **Español** | [日本語](README.ja.md) | [Català](README.ca.md) | [Euskara](README.eu.md) | [Andaluz](README.an.md) | [Galego](README.gl.md)

</div>

---

## Cómo funciona

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Fuentes RSS │────▶│  Normalizar  │────▶│  Deduplicar  │────▶│  Curar (IA) │
│  (BBC, NYT…) │     │  + extraer   │     │  por lote +  │     │  resumir +  │
│              │     │  contenido   │     │  histórico   │     │  clasificar │
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  persistencia│
                    └─────────────┘     └──────────────┘
```

1. **Recolección** — obtiene artículos de las fuentes configuradas en `src/config/sources.ts`
2. **Normalización** — extrae y limpia el contenido HTML; si es insuficiente, enriquece desde el artículo original
3. **Deduplicación** — elimina duplicados dentro del lote actual y contra ejecuciones previas (similitud de texto)
4. **Curado con IA** — genera un resumen en español y hasta 4 tags por artículo usando cualquier API compatible con OpenAI
5. **Publicación** — sirve el feed RSS en `/rss.xml` y un health-check en `/health`

## Características principales

- **Job de refresco** ejecutable cada 15 min (`npm run refresh`)
- **Servidor HTTP** ligero con `GET /health` y `GET /rss.xml`
- **Persistencia en PostgreSQL** — esquema autogenerado al arrancar
- **Proveedor LLM desacoplado** — compatible con OpenAI, Anthropic, Ollama o cualquier API OpenAI-compatible
- **Fallback sin IA** — si no hay API key, genera resúmenes extractivos para no romper la publicación
- **Deduplicación inteligente** — por lote y contra el histórico, basada en similitud textual
- **Pesos por fuente** — prioriza fuentes de mayor relevancia en el feed final
- **Validación con Zod** — toda la configuración se valida al arrancar

## Inicio rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-usuario/rssai.git
cd rssai
npm install

# 2. Configurar variables de entorno
cp .env.example .env   # editar con tus valores

# 3. Ejecutar tests
npm test

# 4. Iniciar en desarrollo
npm run dev             # servidor con hot-reload

# 5. En otra terminal, lanzar un refresco
npm run refresh
```

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | *(obligatorio)* |
| `APP_BASE_URL` | URL pública del servicio | `http://localhost:3000` |
| `PORT` | Puerto del servidor HTTP | `3000` |
| `FEED_TITLE` | Título del feed RSS | `RSSAI` |
| `FEED_DESCRIPTION` | Descripción del feed | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | Idioma del feed | `es` |
| `FEED_MAX_ITEMS` | Máximo de artículos en el feed | `50` |
| `FETCH_TIMEOUT_MS` | Timeout de fetch por fuente (ms) | `10000` |
| `LLM_PROVIDER` | Proveedor LLM | `openai-compatible` |
| `LLM_BASE_URL` | Base URL de la API LLM | `https://api.openai.com/v1` |
| `LLM_API_KEY` | API key del proveedor LLM | *(opcional — sin ella usa fallback)* |
| `LLM_MODEL` | Modelo a utilizar | `gpt-4.1-mini` |

> Si `LLM_API_KEY` no está configurada, el sistema usa un fallback extractivo que no requiere IA.

## Estructura del proyecto

```
src/
├── config/
│   ├── env.ts              # Validación de env vars con Zod
│   └── sources.ts          # Fuentes RSS configuradas
├── db/
│   ├── database.ts         # Conexión a PostgreSQL
│   └── repository.ts       # Queries y esquema
├── feeds/
│   ├── feed-fetcher.ts     # Descarga y parseo de feeds
│   └── article-extractor.ts # Enriquecimiento de contenido
├── llm/
│   ├── provider.ts         # Interfaz LlmProvider
│   ├── openai-compatible-provider.ts  # Implementación OpenAI
│   └── factory.ts          # Factoría de proveedores
├── rss/
│   └── render-rss.ts       # Generación del XML RSS
├── services/
│   └── curation-service.ts # Orquestación del pipeline
├── utils/
│   ├── dedupe.ts           # Deduplicación por similitud
│   ├── html.ts             # Sanitización HTML
│   └── text.ts             # Utilidades de texto
├── app.ts                  # Handler HTTP
├── server.ts               # Punto de entrada del servidor
└── bin/
    └── refresh.ts          # Script de refresco (cron)
```

## Despliegue

La arquitectura se compone de dos procesos:

| Proceso | Comando | Descripción |
|---|---|---|
| **Servidor web** | `npm start` | Sirve `/rss.xml` y `/health` |
| **Cron de refresco** | `npm run refresh` | Ejecutar cada 15 min |

Ambos comparten la misma base de datos y las mismas variables de entorno.

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
    # ejecutar con cron externo o restart policy
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run dev` | Servidor en desarrollo con hot-reload |
| `npm run refresh` | Ejecuta un ciclo de refresco |
| `npm start` | Servidor en producción |
| `npm test` | Ejecuta los tests con Vitest |

## Contribuir

1. Haz un fork del repositorio
2. Crea una rama: `git checkout -b mi-mejora`
3. Haz commit: `git commit -m "Añadir mi mejora"`
4. Push: `git push origin mi-mejora`
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
