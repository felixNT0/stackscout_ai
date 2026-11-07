"use client";

import { JobCard, JobCardSkeleton } from "@/components/jobs/job-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Job, JobSearchFilters } from "@/types";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "freelance",
  "internship",
  "temporary",
];
const REMOTE_STATUSES = ["remote", "hybrid", "on-site"];
const EXPERIENCE_LEVELS = [
  "internship",
  "entry",
  "junior",
  "mid",
  "senior",
  "lead",
  "principal",
  "director",
];
const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "INR", "CAD", "AUD"];
const PAGE_SIZE = 12;

type SortKey = "relevance" | "newest" | "salary_desc" | "salary_asc";
type ViewMode = "grid" | "list";

interface ProviderInfo {
  name: string;
  count: number;
  error: string | null;
  mocked: boolean;
}

interface SearchResponse {
  jobs: Job[];
  total: number;
  page: number;
  page_size: number;
  providers: ProviderInfo[];
  used_mock: boolean;
  resolved_query: string;
  resolved_filters: JobSearchFilters;
}

interface FilterState {
  job_title: string;
  keywords: string;
  technology: string;
  skill: string;
  company: string;
  location: string;
  country: string;
  employment_type: string[];
  remote_status: string[];
  experience_level: string[];
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  date_posted: string;
}

const EMPTY_FILTERS: FilterState = {
  job_title: "",
  keywords: "",
  technology: "",
  skill: "",
  company: "",
  location: "",
  country: "",
  employment_type: [],
  remote_status: [],
  experience_level: [],
  salary_min: "",
  salary_max: "",
  salary_currency: "",
  date_posted: "",
};

function buildFilters(f: FilterState): JobSearchFilters {
  const filters: JobSearchFilters = {};
  if (f.job_title.trim()) filters.job_title = f.job_title.trim();
  if (f.keywords.trim()) filters.keywords = f.keywords.trim();
  if (f.technology.trim()) filters.technology = f.technology.trim();
  if (f.skill.trim()) filters.skill = f.skill.trim();
  if (f.company.trim()) filters.company = f.company.trim();
  if (f.location.trim()) filters.location = f.location.trim();
  if (f.country.trim()) filters.country = f.country.trim();
  if (f.employment_type.length) filters.employment_type = f.employment_type;
  if (f.remote_status.length) filters.remote_status = f.remote_status;
  if (f.experience_level.length) filters.experience_level = f.experience_level;
  const min = parseFloat(f.salary_min);
  const max = parseFloat(f.salary_max);
  if (!Number.isNaN(min) && min >= 0) filters.salary_min = min;
  if (!Number.isNaN(max) && max >= 0) filters.salary_max = max;
  if (f.salary_currency) filters.salary_currency = f.salary_currency;
  if (f.date_posted) filters.date_posted = f.date_posted;
  return filters;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function capitalize(s: string) {
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function FilterPanel({
  filters,
  onChange,
  onClear,
  className,
}: {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
  className?: string;
}) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="f-job-title">Job title</Label>
          <Input
            id="f-job-title"
            placeholder="e.g. Frontend Developer"
            value={filters.job_title}
            onChange={(e) => set("job_title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-keywords">Keywords</Label>
          <Input
            id="f-keywords"
            placeholder="e.g. react, typescript"
            value={filters.keywords}
            onChange={(e) => set("keywords", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-technology">Technology</Label>
          <Input
            id="f-technology"
            placeholder="e.g. Next.js, Tailwind"
            value={filters.technology}
            onChange={(e) => set("technology", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-skill">Skill</Label>
          <Input
            id="f-skill"
            placeholder="e.g. GraphQL"
            value={filters.skill}
            onChange={(e) => set("skill", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-company">Company</Label>
          <Input
            id="f-company"
            placeholder="e.g. Acme Corp"
            value={filters.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-location">Location</Label>
          <Input
            id="f-location"
            placeholder="e.g. Lagos, Remote"
            value={filters.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-country">Country</Label>
          <Input
            id="f-country"
            placeholder="e.g. Nigeria"
            value={filters.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date posted</Label>
          <Select
            value={filters.date_posted || "any"}
            onValueChange={(v) => set("date_posted", v === "any" ? "" : v)}
          >
            <SelectTrigger aria-label="Date posted">
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Employment type</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EMPLOYMENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.employment_type.includes(t)}
                onCheckedChange={() =>
                  set("employment_type", toggle(filters.employment_type, t))
                }
              />
              {capitalize(t)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Work arrangement</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {REMOTE_STATUSES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.remote_status.includes(r)}
                onCheckedChange={() =>
                  set("remote_status", toggle(filters.remote_status, r))
                }
              />
              {capitalize(r)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Experience level</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {EXPERIENCE_LEVELS.map((l) => (
            <label key={l} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.experience_level.includes(l)}
                onCheckedChange={() =>
                  set("experience_level", toggle(filters.experience_level, l))
                }
              />
              {capitalize(l)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="f-salary-min">Salary min</Label>
          <Input
            id="f-salary-min"
            type="number"
            min={0}
            placeholder="80000"
            value={filters.salary_min}
            onChange={(e) => set("salary_min", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-salary-max">Salary max</Label>
          <Input
            id="f-salary-max"
            type="number"
            min={0}
            placeholder="150000"
            value={filters.salary_max}
            onChange={(e) => set("salary_max", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-currency">Currency</Label>
          <Select
            value={filters.salary_currency || "any"}
            onValueChange={(v) => set("salary_currency", v === "any" ? "" : v)}
          >
            <SelectTrigger id="f-currency" aria-label="Salary currency">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-muted-foreground"
      >
        <X className="mr-1 h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}

function JobSearchPageInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialLocation = searchParams.get("location") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [nlMode, setNlMode] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ...EMPTY_FILTERS,
    ...(initialQuery ? { job_title: initialQuery } : {}),
    ...(initialLocation ? { location: initialLocation } : {}),
  });
  const [sort, setSort] = useState<SortKey>("relevance");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [saveSearch, setSaveSearch] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (targetPage: number, sortOverride?: SortKey) => {
      const text = query.trim();
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/jobs/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: text || "jobs",
            filters: buildFilters(filters),
            page: targetPage,
            page_size: PAGE_SIZE,
            sort: sortOverride ?? sort,
            view,
            save_search: saveSearch,
            natural_language: nlMode,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (body as { error?: string }).error ?? "Search failed",
          );
        }
        const data = (body as { data: SearchResponse }).data;
        setResult(data);
        setPage(data.page);
        setHasSearched(true);
        if (data.used_mock) {
          toast({
            title: "Demo data",
            description:
              "Showing demo data — configure job provider API keys for real results.",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
        toast({
          title: "Search failed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [query, nlMode, filters, sort, view, saveSearch, toast],
  );

  // Initial load: run a search on mount (uses URL params if present)
  useEffect(() => {
    void runSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = result
    ? Math.max(1, Math.ceil(result.total / result.page_size))
    : 1;
  const jobs = result?.jobs ?? [];

  const pageNumbers: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    const start = Math.max(1, Math.min(page - 1, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    if (start > 1) pageNumbers.push("…");
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (end < totalPages) pageNumbers.push("…");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Search</h1>
        <p className="mt-1 text-muted-foreground">
          Search across job providers manually or describe what you're looking
          for in plain language.
        </p>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="nl-query">
              {nlMode ? "Describe the job you're looking for" : "Search query"}
            </Label>
            {nlMode ? (
              <Textarea
                id="nl-query"
                placeholder="e.g. remote React jobs paying $80k+ with visa sponsorship"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void runSearch(1);
                  }
                }}
              />
            ) : (
              <Input
                id="nl-query"
                placeholder="e.g. Senior React Developer, Node.js engineer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch(1);
                }}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="ai-search"
                checked={nlMode}
                onCheckedChange={setNlMode}
              />
              <Label
                htmlFor="ai-search"
                className="flex items-center gap-1.5 text-sm font-normal"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Search with AI
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-search"
                checked={saveSearch}
                onCheckedChange={(v) => setSaveSearch(v === true)}
              />
              <Label htmlFor="save-search" className="text-sm font-normal">
                Save this search
              </Label>
            </div>
            <Button
              onClick={() => void runSearch(1)}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        <div className="mb-4 lg:mb-0">
          <Button
            variant="outline"
            className="w-full justify-between lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
              {
                Object.values(filters).filter((v) =>
                  Array.isArray(v) ? v.length > 0 : v !== "",
                ).length
              }
            </span>
          </Button>
          <Card className="hidden lg:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters(EMPTY_FILTERS)}
              />
            </CardContent>
          </Card>
          {filtersOpen && (
            <Card className="mt-2 lg:hidden">
              <CardContent className="p-4">
                <FilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onClear={() => setFilters(EMPTY_FILTERS)}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4 min-w-0">
          {result?.used_mock && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              Showing demo data — configure job provider API keys for real
              results.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {loading
                ? "Searching..."
                : result
                  ? `${result.total} job${result.total === 1 ? "" : "s"} found${result.resolved_query ? ` for "${result.resolved_query}"` : ""}`
                  : "Enter a query and hit Search."}
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={sort}
                onValueChange={(v) => {
                  const s = v as SortKey;
                  setSort(s);
                  if (hasSearched && !loading) void runSearch(1, s);
                }}
              >
                <SelectTrigger className="w-[170px]" aria-label="Sort results">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="salary_desc">
                    Salary: high → low
                  </SelectItem>
                  <SelectItem value="salary_asc">Salary: low → high</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-md border">
                <Button
                  variant={view === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setView("list")}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {error && !loading && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-destructive">
                {error}. Try adjusting your search or filters.
              </CardContent>
            </Card>
          )}

          {!loading && hasSearched && jobs.length === 0 && !error && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No jobs found</p>
                <p className="text-sm text-muted-foreground">
                  Try broadening your search or clearing some filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          )}

          {loading ? (
            view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            )
          ) : jobs.length > 0 ? (
            view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} variant="card" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} variant="row" />
                ))}
              </div>
            )
          ) : null}

          {/* Pagination */}
          {result && result.total > 0 && !loading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {result.page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => void runSearch(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                {pageNumbers.map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`e${i}`}
                      className="px-1 text-sm text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "secondary" : "outline"}
                      size="sm"
                      className="w-9 px-0"
                      disabled={loading}
                      onClick={() => void runSearch(p)}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => void runSearch(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Sources */}
          {result && result.providers.length > 0 && !loading && (
            <p className="text-xs text-muted-foreground">
              Sources:{" "}
              {result.providers.map((p) => (
                <span key={p.name}>
                  {p.name} ({p.error ? "error" : p.count})
                  {p.mocked ? " [demo]" : ""}
                  {" · "}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <JobSearchPageInner />
    </Suspense>
  );
}
