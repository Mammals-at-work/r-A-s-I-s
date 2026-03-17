# RSSAI

Agregador RSS con IA que recoge noticias de una lista manual de fuentes, las normaliza, elimina duplicados, genera resúmenes en español y publica un `rss.xml` público.

## Qué incluye

- Job de refresco ejecutable cada 15 minutos (`npm run refresh`)
- Servidor HTTP con `GET /health` y `GET /rss.xml`
- Persistencia en Postgres
- Proveedor LLM desacoplado con adaptador OpenAI-compatible
- Fallback sin IA para no romper la publicación

## Variables de entorno

```bash
DATABASE_URL=postgres://localhost:5432/rssai
APP_BASE_URL=http://localhost:3000
PORT=3000
FEED_TITLE=RSSAI
FEED_DESCRIPTION=Resumen automatizado de noticias
FEED_LANGUAGE=es
FEED_MAX_ITEMS=50
FETCH_TIMEOUT_MS=10000
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
```

Si `LLM_API_KEY` no está configurada, el sistema usa fallback extractivo.

## Desarrollo

```bash
npm install
npm run test
npm run dev
```

En otra terminal:

```bash
npm run refresh
```

## Despliegue sugerido

- Un servicio web que sirva `src/server.ts`
- Un cron cada 15 minutos ejecutando `npm run refresh`
- Misma base de datos y mismas variables de entorno para ambos
