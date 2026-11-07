"use client";

import {
  AlertTriangle,
  Briefcase,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface AdminStats {
  totals: {
    users: number;
    jobs: number;
    matches: number;
    applications: number;
    resumes: number;
    searches: number;
    alerts: number;
    notifications: number;
  };
  job_status: Record<string, number>;
  sources: {
    id: string;
    name: string;
    provider_type: string;
    is_active: boolean;
    last_sync_at: string | null;
  }[];
  sync_logs: {
    id: string;
    provider_id: string | null;
    sync_type: string;
    status: string;
    jobs_discovered: number | null;
    jobs_updated: number | null;
    errors: unknown;
    started_at: string;
    completed_at: string | null;
  }[];
  recent_searches: {
    id: string;
    query: string;
    results_count: number | null;
    created_at: string;
    user_id: string;
  }[];
  failed_resumes: {
    id: string;
    file_name: string | null;
    status: string;
    error_message: string | null;
    created_at: string;
  }[];
}

interface AdminUser {
  id: string;
  user_id: string;
  full_name: string | null;
  professional_headline: string | null;
  location: string | null;
  role: string;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function syncStatusVariant(
  status: string,
): "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "completed":
    case "success":
      return "success";
    case "running":
    case "in_progress":
      return "warning";
    default:
      return "destructive";
  }
}

function roleVariant(role: string): "default" | "secondary" | "warning" {
  switch (role) {
    case "super_admin":
      return "default";
    case "admin":
      return "warning";
    default:
      return "secondary";
  }
}

const JOB_STATUS_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-slate-500",
];

export default function AdminPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [statsChecked, setStatsChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load admin stats");
      const json = await res.json();
      setStats(json.data);
    } catch {
      toast({
        title: "Error",
        description: "Could not load admin statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setStatsChecked(true);
    }
  }, [toast]);

  const loadUsers = useCallback(
    async (p: number, q: string) => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), q });
        const res = await fetch(`/api/admin/users?${params}`);
        if (!res.ok) throw new Error("Failed to load users");
        const json = await res.json();
        setUsers(json.data?.users ?? []);
        setUsersTotal(json.data?.total ?? 0);
      } catch {
        toast({
          title: "Error",
          description: "Could not load users",
          variant: "destructive",
        });
      } finally {
        setUsersLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (statsChecked && !forbidden) loadUsers(page, debouncedQuery);
  }, [page, debouncedQuery, forbidden, statsChecked, loadUsers]);

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdatingRole(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to update role");
      }
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role } : u)),
      );
      toast({
        title: "Role updated",
        description: `User role set to ${formatStatus(role)}`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not update role",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/admin/discover", { method: "POST" });
      if (!res.ok) throw new Error("Failed to queue discovery");
      toast({
        title: "Discovery queued",
        description: "Job discovery has been queued",
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not queue discovery",
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          You don't have permission to view this page. Contact a super admin if
          you believe this is a mistake.
        </p>
      </div>
    );
  }

  const totals = stats?.totals;
  const jobStatusEntries = Object.entries(stats?.job_status ?? {});
  const jobStatusTotal = jobStatusEntries.reduce((s, [, v]) => s + v, 0);
  const totalPages = Math.max(1, Math.ceil(usersTotal / 25));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and management
          </p>
        </div>
      </div>

      {/* Totals grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard
          label="Users"
          value={totals?.users ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Jobs"
          value={totals?.jobs ?? 0}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Matches"
          value={totals?.matches ?? 0}
          icon={<Search className="h-4 w-4" />}
        />
        <StatCard
          label="Applications"
          value={totals?.applications ?? 0}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Resumes"
          value={totals?.resumes ?? 0}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Searches"
          value={totals?.searches ?? 0}
          icon={<Search className="h-4 w-4" />}
        />
        <StatCard
          label="Alerts"
          value={totals?.alerts ?? 0}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Job Sources & Sync */}
        <Card>
          <CardHeader>
            <CardTitle>Job Sources &amp; Sync</CardTitle>
            <CardDescription>
              Configured sources and recent sync activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Sources</h4>
              {!stats || stats.sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No job sources configured.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Name</th>
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 font-medium">Last Sync</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.sources.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{s.name}</td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {formatStatus(s.provider_type)}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge
                              variant={s.is_active ? "success" : "secondary"}
                            >
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-2 text-muted-foreground whitespace-nowrap">
                            {formatDate(s.last_sync_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Recent Sync Logs</h4>
              {!stats || stats.sync_logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sync logs yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Type</th>
                        <th className="py-2 pr-3 font-medium">Status</th>
                        <th className="py-2 pr-3 font-medium">Found</th>
                        <th className="py-2 pr-3 font-medium">Errors</th>
                        <th className="py-2 font-medium">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.sync_logs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">
                            {formatStatus(log.sync_type)}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant={syncStatusVariant(log.status)}>
                              {formatStatus(log.status)}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3">
                            {log.jobs_discovered ?? 0}
                          </td>
                          <td className="py-2 pr-3">
                            {Array.isArray(log.errors)
                              ? log.errors.length
                              : log.errors
                                ? 1
                                : 0}
                          </td>
                          <td className="py-2 text-muted-foreground whitespace-nowrap">
                            {formatDate(log.started_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Platform Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
            <CardDescription>
              Job status breakdown and recent searches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Job Status</h4>
              {jobStatusEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs yet.</p>
              ) : (
                <div className="space-y-3">
                  {jobStatusEntries.map(([status, count], i) => (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{formatStatus(status)}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full ${JOB_STATUS_COLORS[i % JOB_STATUS_COLORS.length]}`}
                          style={{
                            width: `${jobStatusTotal ? (count / jobStatusTotal) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Recent Searches</h4>
              {!stats || stats.recent_searches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No searches yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Query</th>
                        <th className="py-2 pr-3 font-medium">Results</th>
                        <th className="py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_searches.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 max-w-[200px] truncate">
                            {s.query}
                          </td>
                          <td className="py-2 pr-3">{s.results_count ?? 0}</td>
                          <td className="py-2 text-muted-foreground whitespace-nowrap">
                            {formatDate(s.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Resumes */}
      <Card>
        <CardHeader>
          <CardTitle>Failed Resumes</CardTitle>
          <CardDescription>
            Resume uploads that failed processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stats || stats.failed_resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              None — no failed resume uploads.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">File</th>
                    <th className="py-2 pr-3 font-medium">Error</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.failed_resumes.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {r.file_name ?? "Unknown file"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground max-w-[300px] truncate">
                        {r.error_message ?? "—"}
                      </td>
                      <td className="py-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>{usersTotal} total users</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or headline..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No users found{debouncedQuery ? ` for "${debouncedQuery}"` : ""}.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">User</th>
                      <th className="py-2 pr-3 font-medium">Location</th>
                      <th className="py-2 pr-3 font-medium">Role</th>
                      <th className="py-2 pr-3 font-medium">Joined</th>
                      <th className="py-2 font-medium">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <p className="font-medium">
                            {u.full_name ?? "Unnamed user"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {u.professional_headline ?? "—"}
                          </p>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {u.location ?? "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={roleVariant(u.role)}>
                            {formatStatus(u.role)}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="py-2">
                          <Select
                            value={u.role}
                            onValueChange={(v) => {
                              if (v !== u.role) handleRoleChange(u.user_id, v);
                            }}
                            disabled={updatingRole === u.user_id}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">
                                Super Admin
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || usersLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || usersLoading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Platform-wide operations</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDiscover} disabled={discovering}>
            <RefreshCw
              className={`h-4 w-4 ${discovering ? "animate-spin" : ""}`}
            />
            {discovering ? "Queuing..." : "Run discovery now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
