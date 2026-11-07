import type { JobSearchFilters } from "@/types";

export interface ProviderSearchParams {
  query: string;
  filters?: JobSearchFilters;
  page?: number;
  pageSize?: number;
  /** ISO country code, e.g. "us", "gb" — used by providers with regional endpoints */
  country?: string;
  /** Company slug/board token for board-specific providers (Greenhouse, Lever) */
  companyBoard?: string;
}

/** A job as returned by a provider, before DB persistence. */
export interface ProviderJob {
  external_id: string | null;
  title: string;
  company: string;
  company_logo?: string | null;
  description: string;
  responsibilities?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  location?: string | null;
  country?: string | null;
  remote_status?: "remote" | "hybrid" | "on-site" | null;
  employment_type?: string | null;
  experience_level?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: "hourly" | "monthly" | "annual" | null;
  application_url: string;
  source_name: string;
  source_url?: string | null;
  published_at?: string | null;
  /** True when data comes from a mock/demo adapter, never a real provider */
  is_mock?: boolean;
  raw?: unknown;
}

export interface ProviderSearchResult {
  provider: string;
  jobs: ProviderJob[];
  total?: number;
  error?: string;
  /** True when the provider is not configured and a mock fallback was used */
  mocked?: boolean;
}

export interface JobProvider {
  readonly name: string;
  isConfigured(): boolean;
  search(params: ProviderSearchParams): Promise<ProviderSearchResult>;
}
