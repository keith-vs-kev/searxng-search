# SearXNG Search — OpenClaw Plugin

Self-hosted web search for OpenClaw agents, powered by [SearXNG](https://docs.searxng.org/).

Replaces or supplements the built-in Brave/Perplexity `web_search` tool with a
privacy-respecting, self-hosted meta-search engine. No API keys required.

## Quick Start

### 1. Start SearXNG

```bash
cd docker
docker compose up -d
```

This spins up SearXNG on `localhost:8888` with Redis caching and
DuckDuckGo + Google + Bing enabled.

### 2. Install the plugin

```bash
openclaw plugins install -l /path/to/searxng-search
```

### 3. Configure

In your OpenClaw config (`openclaw.yaml` or via `openclaw configure`):

```yaml
plugins:
  entries:
    searxng-search:
      enabled: true
      config:
        searxngUrl: "http://localhost:8888"
        engines:
          - duckduckgo
          - google
          - bing
        timeout: 10000
```

### 4. Enable for agents

The tool is registered as **optional** (`searxng_web_search`). Add it to your
agent's tool allowlist:

```yaml
agents:
  list:
    - id: my-agent
      tools:
        allow:
          - searxng_web_search
```

### 5. Restart the gateway

```bash
openclaw gateway restart
```

## Tool Reference

### `searxng_web_search`

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `query`     | string | ✅       | Search query string |
| `count`     | number | ❌       | Number of results (1-10, default: 5) |
| `country`   | string | ❌       | 2-letter country code (e.g., `US`, `DE`) |
| `language`  | string | ❌       | ISO language code (e.g., `en`, `de`, `fr`) |
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

## Docker Configuration

The `docker/` directory contains:

- **docker-compose.yml** — SearXNG + Redis stack
- **settings.yml** — SearXNG configuration with safe defaults

### Customizing engines

Edit `docker/settings.yml` to enable/disable search engines. Restart
the container after changes:

```bash
cd docker && docker compose restart searxng
```

### Health check

```bash
curl http://localhost:8888/healthz
```

## Architecture

```
Agent → searxng_web_search tool → SearxngClient → SearXNG API (localhost:8888)
                                                     ↓
                                               DuckDuckGo / Google / Bing
```

- **No API keys needed** — SearXNG scrapes search engines directly
- **Redis caching** — reduces duplicate requests
- **Localhost only** — port bound to 127.0.0.1

## Development

```bash
npm install
npm run build    # Compile TypeScript
npm run dev      # Watch mode
```

## License

MIT
