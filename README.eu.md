<div align="center">

# r-A-s-I-s(rss & ia)

**RSS agregatzaile adimenduna IA bidezko kudeaketarekin**

Iturri anitzetatik berriak biltzen ditu, bikoiztuak ezabatzen ditu, gaztelaniazko laburpenak sortzen ditu eta kontsumitzeko prest dagoen `rss.xml` jarioa argitaratzen du.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.en.md) | [Español](README.md) | [日本語](README.ja.md) | [Català](README.ca.md) | **Euskara** | [Andaluz](README.an.md) | [Galego](README.gl.md)

</div>

---

## Nola funtzionatzen du

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  RSS iturriak│────▶│  Normalizatu │────▶│ Desbikoiztatu│────▶│ Kuratu (IA) │
│  (BBC, NYT…) │     │  + edukia    │     │  lotearen +  │     │  laburbildu +│
│              │     │  erauzi      │     │  historiala  │     │  sailkatu   │
└─────────────┘     └─────────────┘     └──────────────┘     └──────┬──────┘
                                                                     │
                    ┌─────────────┐     ┌──────────────┐             │
                    │  GET /rss.xml│◀────│  PostgreSQL  │◀────────────┘
                    │  GET /health │     │  iraunkortasuna│
                    └─────────────┘     └──────────────┘
```

1. **Bilketa** — `src/config/sources.ts`-en konfiguratutako iturrietatik artikuluak eskuratzen ditu
2. **Normalizazioa** — HTML edukia erauzi eta garbitzen du; nahikoa ez bada, jatorrizko artikulutik aberasten du
3. **Desbikoizketa** — bikoiztuak ezabatzen ditu uneko lotearen barruan eta aurreko exekuzioekin alderatuz (testu-antzekotasuna)
4. **IA bidezko kurazioa** — gaztelaniazko laburpena eta gehienez 4 etiketa sortzen ditu artikulu bakoitzeko, OpenAI-rekin bateragarria den edozein API erabiliz
5. **Argitalpena** — RSS jarioa `/rss.xml`-en eta osasun-egiaztapena `/health`-en eskaintzen ditu

## Ezaugarri nagusiak

- **Freskatze-lana** 15 minuturo exekutagarria (`npm run refresh`)
- **HTTP zerbitzari arina** `GET /health` eta `GET /rss.xml` endepointekin
- **PostgreSQL iraunkortasuna** — eskema automatikoki sortzen da abiaraztean
- **LLM hornitzaile desakoplatua** — OpenAI, Anthropic, Ollama edo OpenAI-rekin bateragarria den edozein APIrekin
- **IArik gabeko fallbacka** — API giltza ez badago, laburpen erauzleak sortzen ditu argitalpena ez eteteko
- **Desbikoizketa adimentsua** — loteka eta historialaren aurka, testu-antzekotasunean oinarrituta
- **Iturri-pisuak** — garrantzi handiagoko iturriak lehenesten ditu azken jarioan
- **Zod baliozkotzea** — konfigurazio guztia abiaraztean balioztatzen da

## Hasiera azkarra

```bash
# 1. Klonatu eta instalatu
git clone https://github.com/zure-erabiltzailea/rssai.git
cd rssai
npm install

# 2. Ingurune-aldagaiak konfiguratu
cp .env.example .env   # zure balioekin editatu

# 3. Testak exekutatu
npm test

# 4. Garapen moduan abiarazi
npm run dev             # zerbitzaria hot-reload-ekin

# 5. Beste terminal batean, freskatze bat abiarazi
npm run refresh
```

## Ingurune-aldagaiak

| Aldagaia | Deskribapena | Balio lehenetsia |
|---|---|---|
| `DATABASE_URL` | PostgreSQL konexio-katea | *(derrigorrezkoa)* |
| `APP_BASE_URL` | Zerbitzuaren URL publikoa | `http://localhost:3000` |
| `PORT` | HTTP zerbitzariaren ataka | `3000` |
| `FEED_TITLE` | RSS jarioaren izenburua | `RSSAI` |
| `FEED_DESCRIPTION` | Jarioaren deskribapena | `Resumen automatizado de noticias` |
| `FEED_LANGUAGE` | Jarioaren hizkuntza | `es` |
| `FEED_MAX_ITEMS` | Jarioan gehienezko artikulu kopurua | `50` |
| `FETCH_TIMEOUT_MS` | Iturri bakoitzeko fetch denbora-muga (ms) | `10000` |
| `LLM_PROVIDER` | LLM hornitzailea | `openai-compatible` |
| `LLM_BASE_URL` | LLM APIaren oinarri URLa | `https://api.openai.com/v1` |
| `LLM_API_KEY` | LLM hornitzailearen API giltza | *(aukerakoa — gabe fallbacka erabiltzen du)* |
| `LLM_MODEL` | Erabiltzeko eredua | `gpt-4.1-mini` |

> `LLM_API_KEY` konfiguratuta ez badago, sistemak IArik behar ez duen fallback erauzlea erabiltzen du.

## Proiektuaren egitura

```
src/
├── config/
│   ├── env.ts              # Ingurune-aldagaien baliozkotzea Zod-ekin
│   └── sources.ts          # Konfiguratutako RSS iturriak
├── db/
│   ├── database.ts         # PostgreSQL konexioa
│   └── repository.ts       # Kontsultak eta eskema
├── feeds/
│   ├── feed-fetcher.ts     # Jarioen deskarga eta parseatze
│   └── article-extractor.ts # Edukiaren aberastea
├── llm/
│   ├── provider.ts         # LlmProvider interfazea
│   ├── openai-compatible-provider.ts  # OpenAI inplementazioa
│   └── factory.ts          # Hornitzaile-fabrika
├── rss/
│   └── render-rss.ts       # RSS XML sorkuntza
├── services/
│   └── curation-service.ts # Pipeline orkestrazioa
├── utils/
│   ├── dedupe.ts           # Antzekotasunean oinarritutako desbikoizketa
│   ├── html.ts             # HTML saneamendua
│   └── text.ts             # Testu utilitateak
├── app.ts                  # HTTP handler-a
├── server.ts               # Zerbitzariaren sarrera-puntua
└── bin/
    └── refresh.ts          # Freskatze-scripta (cron)
```

## Hedapena

Arkitektura bi prozesuz osatuta dago:

| Prozesua | Komandoa | Deskribapena |
|---|---|---|
| **Web zerbitzaria** | `npm start` | `/rss.xml` eta `/health` eskaintzen ditu |
| **Freskatze crona** | `npm run refresh` | 15 minuturo exekutatu |

Biek datu-base bera eta ingurune-aldagai berdinak partekatzen dituzte.

### Docker Compose adibidea

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
    # kanpoko cron edo restart policy batekin exekutatu
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/rssai

volumes:
  pgdata:
```

## Eskuragarri dauden scriptak

| Scripta | Deskribapena |
|---|---|
| `npm run build` | TypeScript `dist/`-era konpilatu |
| `npm run dev` | Garapen zerbitzaria hot-reload-ekin |
| `npm run refresh` | Freskatze-ziklo bat exekutatu |
| `npm start` | Produkzio zerbitzaria |
| `npm test` | Testak Vitest-ekin exekutatu |

## Lagundu

1. Egin repositorioaren fork bat
2. Sortu adar bat: `git checkout -b nire-hobekuntza`
3. Egin commit: `git commit -m "Nire hobekuntza gehitu"`
4. Push: `git push origin nire-hobekuntza`
5. Ireki Pull Request bat

## Lizentzia

Proiektu hau [MIT](LICENSE) lizentziapean dago.
