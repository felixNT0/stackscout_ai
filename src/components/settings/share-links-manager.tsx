"use client";

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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Link2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ShareLink = {
  id: string;
  token: string;
  type: string;
  target_id: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
};

const TYPES = [
  { value: "profile", label: "Candidate Profile", desc: "Headline, summary, skills, experience" },
  { value: "matches", label: "Top Matches", desc: "Your top 10 job matches with scores" },
  { value: "application", label: "Application", desc: "A specific application (needs target ID)" },
];

export function ShareLinksManager() {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("profile");
  const [targetId, setTargetId] = useState("");
  const [expiresDays, setExpiresDays] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/share");
      const data = await res.json();
      if (res.ok) setLinks(data.links ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          target_id: type === "application" && targetId.trim() ? targetId.trim() : undefined,
          expires_in_days: expiresDays ? parseInt(expiresDays, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");
      setLinks((prev) => [data.link, ...prev]);
      setTargetId("");
      setExpiresDays("");
      toast({ title: "Share link created" });
    } catch (err) {
      toast({
        title: "Failed to create link",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/share?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast({ title: "Share link revoked" });
    } catch {
      toast({ title: "Failed to revoke", variant: "destructive" });
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Share Links
        </CardTitle>
        <CardDescription>
          Create public links to share your profile, matches, or applications.
          Anyone with the link can view — no account needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create form */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Share type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {TYPES.find((t) => t.value === type)?.desc}
              </p>
            </div>
            {type === "application" && (
              <div className="sm:col-span-1">
                <Label htmlFor="target-id">Application ID</Label>
                <Input
                  id="target-id"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="UUID of application"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            )}
            <div>
              <Label htmlFor="expires">Expires in (days)</Label>
              <Input
                id="expires"
                type="number"
                min={1}
                max={90}
                value={expiresDays}
                onChange={(e) => setExpiresDays(e.target.value)}
                placeholder="Never"
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={create}
            disabled={creating || (type === "application" && !targetId.trim())}
          >
            <Plus className="h-4 w-4 mr-1" />
            {creating ? "Creating…" : "Create share link"}
          </Button>
        </div>

        {/* Link list */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No share links yet. Create one above to share your info publicly.
          </p>
        ) : (
          <div className="space-y-2">
            {links.map((l) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${l.token}`;
              const expired = l.expires_at && new Date(l.expires_at) < new Date();
              return (
                <div key={l.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="capitalize shrink-0">
                        {l.type}
                      </Badge>
                      <code className="text-xs text-muted-foreground truncate">
                        {url}
                      </code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyLink(l.token)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revoke(l.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {l.view_count} view{l.view_count !== 1 ? "s" : ""}
                    {l.expires_at &&
                      ` · ${expired ? "expired" : `expires ${new Date(l.expires_at).toLocaleDateString()}`}`}
                    {` · created ${new Date(l.created_at).toLocaleDateString()}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
