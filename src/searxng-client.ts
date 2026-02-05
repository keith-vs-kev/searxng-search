/**
 * SearXNG HTTP client — talks to the SearXNG JSON API
 */

import type {
  SearxngApiResponse,
  SearxngPluginConfig,
  SearchResultItem,
} from './types.js';
import { FRESHNESS_MAP } from './types.js';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SEARXNG_URL = 'http://localhost:8888';
const DEFAULT_ENGINES = ['duckduckgo', 'google', 'bing'];
const DEFAULT_TIMEOUT = 10_000;
const MAX_COUNT = 10;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class SearxngClient {
  private readonly baseUrl: string;
  private readonly engines: string[];
  private readonly timeout: number;

  constructor(config?: SearxngPluginConfig) {
    this.baseUrl = (config?.searxngUrl ?? DEFAULT_SEARXNG_URL).replace(/\/+$/, '');
    this.engines = config?.engines ?? DEFAULT_ENGINES;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
  }

  /**
   * Run a search against SearXNG.
   *
   * @param query   Search query string
   * @param opts    Optional search parameters
   * @returns       Array of normalized search results
   */
  async search(
    query: string,
    opts?: {
      count?: number;
      country?: string;
      language?: string;
      freshness?: string;
    },
  ): Promise<{ results: SearchResultItem[]; tookMs: number }> {
    const count = Math.max(1, Math.min(MAX_COUNT, opts?.count ?? 5));

    // Build the query URL
    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('categories', 'general');

    // Engines
    if (this.engines.length > 0) {
      url.searchParams.set('engines', this.engines.join(','));
    }

    // Language (SearXNG uses language codes like "en", "de", "en-US")
    if (opts?.language) {
      url.searchParams.set('language', opts.language);
    }

    // Time range (map Brave-style freshness to SearXNG time_range)
    if (opts?.freshness) {
      const mapped = FRESHNESS_MAP[opts.freshness.toLowerCase()];
      if (mapped) {
        url.searchParams.set('time_range', mapped);
      }
    }

    // SearXNG doesn't have a native "country" param in the same way as Brave.
    // However some engines respect the `language` param for region.
    // We can also try the `region` param if set (e.g. "US" → "en-US").
    if (opts?.country && opts.country.toUpperCase() !== 'ALL') {
      // If language is already set, skip; otherwise construct a locale hint
      if (!opts?.language) {
        url.searchParams.set('language', `en-${opts.country.toUpperCase()}`);
      }
    }

    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(
          `SearXNG returned HTTP ${res.status}: ${detail || res.statusText}`,
        );
      }

      const data: SearxngApiResponse = await res.json() as SearxngApiResponse;
      const tookMs = Date.now() - start;

      // Normalize results to match the web_search output shape
      const results: SearchResultItem[] = (data.results ?? [])
        .slice(0, count)
        .map((r) => ({
          title: r.title ?? '',
          url: r.url ?? '',
          description: r.content ?? '',
          published: r.publishedDate ?? undefined,
          siteName: extractHostname(r.url),
        }));

      return { results, tookMs };
    } catch (err: unknown) {
      const tookMs = Date.now() - start;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(
          `SearXNG request timed out after ${this.timeout}ms`,
        );
      }
      if (err instanceof TypeError && (err as any).cause?.code === 'ECONNREFUSED') {
        throw new Error(
          `Cannot connect to SearXNG at ${this.baseUrl}. Is it running? Start it with: cd docker && docker compose up -d`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Quick health check — hits /healthz or / and checks for 200 */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(`${this.baseUrl}/healthz`, {
          signal: controller.signal,
        });
        return res.ok;
      } catch {
        // Some SearXNG versions don't have /healthz; try root
        const res = await fetch(this.baseUrl, {
          signal: controller.signal,
        });
        return res.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHostname(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
