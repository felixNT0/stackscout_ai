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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const SCOPES = [
  { value: "read", label: "Read", desc: "List jobs, matches, applications, profile" },
  { value: "write", label: "Write", desc: "Create/update applications" },
  { value: "admin", label: "Admin", desc: "Full access (use sparingly)" },
] as const;

export function ApiKeysManager() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/api-keys");
      const data = await res.json();
      if (res.ok) setKeys(data.keys ?? []);
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
    if (!name.trim() || scopes.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setNewKey(data.key);
      setName("");
      setScopes(["read"]);
      load();
      toast({ title: "API key created" });
    } catch (err) {
      toast({
        title: "Failed to create key",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: "API key revoked" });
    } catch {
      toast({ title: "Failed to revoke key", variant: "destructive" });
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Developer API
        </CardTitle>
        <CardDescription>
          Create API keys to access your jobs, matches, and applications
          programmatically. See{" "}
          <code className="text-xs bg-muted px-1 rounded">/docs</code> or{" "}
          <code className="text-xs bg-muted px-1 rounded">docs/API.md</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create form */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My script, CI pipeline"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="mt-2 flex flex-wrap gap-4">
                {SCOPES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                    title={s.desc}
                  >
                    <Checkbox
                      checked={scopes.includes(s.value)}
                      onCheckedChange={(checked) =>
                        setScopes((prev) =>
                          checked
                            ? [...prev, s.value]
                            : prev.filter((v) => v !== s.value),
                        )
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={create} disabled={creating || !name.trim() || scopes.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            {creating ? "Creating…" : "Create API key"}
          </Button>
        </div>

        {/* One-time key display */}
        {newKey && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Copy your API key now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border rounded px-3 py-2 overflow-x-auto">
                {newKey}
              </code>
              <Button size="sm" variant="outline" onClick={copyKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
              Done
            </Button>
          </div>
        )}

        {/* Key list */}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No API keys yet. Create one above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{k.name}</span>
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {k.key_prefix}••••••••
                    {k.last_used_at &&
                      ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    {k.expires_at &&
                      ` · expires ${new Date(k.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => revoke(k.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
