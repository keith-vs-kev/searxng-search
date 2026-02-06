# SearXNG Search — OpenClaw Plugin

Self-hosted web search for OpenClaw agents, powered by [SearXNG](https://docs.searxng.org/).

No API keys. No rate limits. No monthly bills. Just search.

## Active Engines

| Engine | Purpose |
|--------|---------|
| Google | Primary search |
| Startpage | Google results via privacy proxy (fallback) |
| Google News | Current events |
| Wikipedia | Reference & context |
| Wikidata | Structured data |
| GitHub | Code search |

> DDG, Bing, and Mojeek were tested and disabled — DDG throws CAPTCHAs, Bing leaks CJK results, Mojeek gets access-denied after ~5 queries. See test reports in the repo for details.

## Quick Start

### 1. Start SearXNG

```bash
cd docker
docker compose up -d
```

Spins up SearXNG on `localhost:8888` with Redis caching. Default locale: `en-NZ`.

### 2. Install the plugin

Add to your OpenClaw config:

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/searxng-search"]
    },
    "entries": {
      "searxng-search": {
        "enabled": true,
        "config": {
          "searxngUrl": "http://localhost:8888",
          "timeout": 10000
        }
      }
    }
  }
}
```

### 3. Restart gateway

```bash
openclaw gateway restart
```

The `web_search_v2` tool is now available to all agents.

## Tool Reference

### `web_search_v2`

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `query`     | string | ✅       | Search query string |
| `count`     | number | ❌       | Number of results (1-10, default: 5) |
| `country`   | string | ❌       | 2-letter country code (e.g., `NZ`, `US`) |
| `language`  | string | ❌       | ISO language code (e.g., `en`, `de`) |
| `freshness` | string | ❌       | Time filter: `pd` (day), `pw` (week), `pm` (month), `py` (year) |

### Response format

```json
{
  "query": "OpenClaw AI agent",
  "provider": "searxng",
  "count": 3,
  "tookMs": 245,
  "results": [
    {
      "title": "OpenClaw - AI Agent Platform",
      "url": "https://openclaw.ai",
      "description": "Build and deploy AI agents...",
      "siteName": "openclaw.ai"
    }
  ]
}
```

## Architecture

```
Agent → web_search_v2 → Plugin → SearXNG (localhost:8888) → Google + Startpage + Wikipedia + GitHub
                                        ↕
                                  Redis (cache)
```

- **Self-hosted** — runs on your own infrastructure
- **No API keys** — SearXNG queries search engines directly
- **Redis caching** — reduces duplicate requests
- **Localhost only** — port bound to 127.0.0.1

## Configuration

### Docker

Edit `docker/settings.yml` to enable/disable engines:

```bash
cd docker && docker compose restart searxng
```

### Health check

```bash
curl http://localhost:8888/healthz
```

## Test Results

Tested over 4 rounds with 10 search categories each:

| Round | Score | Changes |
|-------|-------|---------|
| R1 | 7/10 | Baseline — DDG CAPTCHAs, junk results |
| R2 | 5.5/10 | Added en-NZ locale — helped NZ queries, broke Bing |
| R3 | 7/10 | Disabled DDG+Mojeek, forced Bing en-US — CJK reduced 70% |
| R4 | **8/10** | Disabled Bing — zero CJK junk, all English results ✅ |

Full reports in `/projects/searxng-test-report-r*.md`.

## Development

```bash
npm install
npm run build
```

## License

MIT
