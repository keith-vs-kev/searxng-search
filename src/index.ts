/**
 * SearXNG Search — OpenClaw Plugin Entry Point
 *
 * Registers the `searxng_web_search` agent tool powered by a self-hosted
 * SearXNG instance. Configure via plugins.entries.searxng-search.config:
 *
 *   {
 *     "searxngUrl": "http://localhost:8888",
 *     "engines": ["duckduckgo", "google", "bing"],
 *     "timeout": 10000
 *   }
 */

import type { OpenClawPluginApi } from 'clawdbot/plugin-sdk';
import { createSearxngSearchTool } from './search-tool.js';
import type { SearxngPluginConfig } from './types.js';

// ---------------------------------------------------------------------------
// Plugin metadata
// ---------------------------------------------------------------------------

export const id = 'searxng-search';

export const configSchema = {
  validate: () => ({ ok: true as const }),
  jsonSchema: {
    type: 'object',
    properties: {
      searxngUrl: {
        type: 'string',
        description: 'Base URL of the SearXNG instance',
        default: 'http://localhost:8888',
      },
      engines: {
        type: 'array',
        items: { type: 'string' },
        description: 'Search engines to use',
        default: ['duckduckgo', 'google', 'bing'],
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 10000,
      },
    },
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Plugin registration
// ---------------------------------------------------------------------------

export function register(api: OpenClawPluginApi) {
  api.logger.info('🔍 SearXNG Search plugin initializing...');

  // Read plugin config
  const pluginConfig = (api.pluginConfig ?? {}) as SearxngPluginConfig;

  const config: SearxngPluginConfig = {
    searxngUrl: pluginConfig.searxngUrl ?? 'http://localhost:8888',
    engines: pluginConfig.engines ?? ['duckduckgo', 'google', 'bing'],
    timeout: pluginConfig.timeout ?? 10_000,
  };

  api.logger.info(
    `🔍 SearXNG Search: connecting to ${config.searxngUrl} (engines: ${config.engines!.join(', ')})`,
  );

  // Create and register the search tool (optional — needs allowlist)
  const searchTool = createSearxngSearchTool(config);
  api.registerTool(searchTool, { optional: true });

  api.logger.info(
    '🔍 SearXNG Search: registered tool "searxng_web_search" (optional — add to agent allowlist)',
  );
}
