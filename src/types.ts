/**
 * SearXNG Search Plugin — Type definitions
 */

// ---------------------------------------------------------------------------
// Plugin config
// ---------------------------------------------------------------------------

export interface SearxngPluginConfig {
  /** Base URL of the SearXNG instance (default: http://localhost:8888) */
  searxngUrl?: string;
  /** Search engines to query (default: ["duckduckgo", "google", "bing"]) */
  engines?: string[];
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// SearXNG API response types
// ---------------------------------------------------------------------------

export interface SearxngResult {
  title: string;
  url: string;
  content?: string;
  engine?: string;
  parsed_url?: string[];
  positions?: number[];
  score?: number;
  category?: string;
  publishedDate?: string;
}

export interface SearxngInfobox {
  infobox?: string;
  id?: string;
  content?: string;
  urls?: Array<{ title: string; url: string }>;
}

export interface SearxngApiResponse {
  query: string;
  number_of_results?: number;
  results: SearxngResult[];
  answers?: string[];
  corrections?: string[];
  infoboxes?: SearxngInfobox[];
  suggestions?: string[];
  unresponsive_engines?: Array<[string, string]>;
}

// ---------------------------------------------------------------------------
// Tool input / output
// ---------------------------------------------------------------------------

export interface SearchToolInput {
  query: string;
  count?: number;
  country?: string;
  language?: string;
  freshness?: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  description: string;
  published?: string;
  siteName?: string;
}

export interface SearchToolOutput {
  query: string;
  provider: 'searxng';
  count: number;
  tookMs: number;
  results: SearchResultItem[];
  cached?: boolean;
}

export interface SearchToolError {
  error: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Freshness mapping (Brave shortcodes → SearXNG time_range values)
// ---------------------------------------------------------------------------

export const FRESHNESS_MAP: Record<string, string> = {
  pd: 'day',
  pw: 'week',
  pm: 'month',
  py: 'year',
};
