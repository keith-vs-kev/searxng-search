/**
 * SearXNG web_search agent tool implementation
 *
 * Replaces the built-in
 * Disable built-in search (tools.web.search.enabled: false) then enable via allowlists:
 *
 *   agents.list[].tools.allow: ["web_search"]
 */

import { SearxngClient } from './searxng-client.js';
import type {
  SearxngPluginConfig,
  SearchToolOutput,
  SearchToolError,
} from './types.js';
import { FRESHNESS_MAP } from './types.js';

// ---------------------------------------------------------------------------
// Tool schema (using plain JSON Schema — compatible with both TypeBox and raw)
// ---------------------------------------------------------------------------

const TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string' as const,
      description: 'Search query string.',
    },
    count: {
      type: 'number' as const,
      description: 'Number of results to return (1-10).',
      minimum: 1,
      maximum: 10,
    },
    country: {
      type: 'string' as const,
      description:
        "2-letter country code for region-specific results (e.g., 'DE', 'US', 'ALL'). Default: 'US'.",
    },
    language: {
      type: 'string' as const,
      description:
        "ISO language code for search results (e.g., 'de', 'en', 'fr').",
    },
    freshness: {
      type: 'string' as const,
      description:
        "Filter results by time. Values: 'pd' (past 24h), 'pw' (past week), 'pm' (past month), 'py' (past year).",
    },
  },
  required: ['query'] as const,
};

// ---------------------------------------------------------------------------
// Valid freshness values
// ---------------------------------------------------------------------------

const VALID_FRESHNESS = new Set(Object.keys(FRESHNESS_MAP));

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createSearxngSearchTool(config?: SearxngPluginConfig) {
  const client = new SearxngClient(config);

  return {
    label: 'SearXNG Web Search',
    name: 'web_search',
    description:
      'Search the web using a self-hosted SearXNG instance. Returns titles, URLs, and descriptions. Supports freshness filtering (pd/pw/pm/py) and language/country targeting.',
    parameters: TOOL_SCHEMA,

    async execute(
      _toolCallId: string,
      args: unknown,
    ): Promise<{ content: Array<{ type: 'text'; text: string }>; details: unknown }> {
      try {
        const params = (args ?? {}) as Record<string, unknown>;

        // --- Validate query ---
        const query =
          typeof params.query === 'string' ? params.query.trim() : '';
        if (!query) {
          return jsonResult({
            error: 'missing_query',
            message: 'The "query" parameter is required.',
          } satisfies SearchToolError);
        }

        // --- Validate freshness ---
        const rawFreshness =
          typeof params.freshness === 'string'
            ? params.freshness.trim().toLowerCase()
            : undefined;
        if (rawFreshness && !VALID_FRESHNESS.has(rawFreshness)) {
          return jsonResult({
            error: 'invalid_freshness',
            message: `freshness must be one of: ${[...VALID_FRESHNESS].join(', ')}`,
          } satisfies SearchToolError);
        }

        // --- Parse count ---
        const count =
          typeof params.count === 'number' && Number.isFinite(params.count)
            ? Math.max(1, Math.min(10, Math.floor(params.count)))
            : 5;

        // --- Optional params ---
        const country =
          typeof params.country === 'string'
            ? params.country.trim()
            : undefined;
        const language =
          typeof params.language === 'string'
            ? params.language.trim()
            : undefined;

        // --- Execute search ---
        const { results, tookMs } = await client.search(query, {
          count,
          country,
          language,
          freshness: rawFreshness,
        });

        const output: SearchToolOutput = {
          query,
          provider: 'searxng',
          count: results.length,
          tookMs,
          results,
        };

        return jsonResult(output);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unknown error during search';
        return jsonResult({
          error: 'searxng_error',
          message,
        } satisfies SearchToolError);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helper — match the OpenClaw tool result format
// ---------------------------------------------------------------------------

function jsonResult(
  data: unknown,
): { content: Array<{ type: 'text'; text: string }>; details: unknown } {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}
