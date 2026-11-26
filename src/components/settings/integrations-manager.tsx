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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
    CheckCircle2,
    KeyRound,
    Loader2,
    Plus,
    Sparkles,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SavedKey = {
  id: string;
  provider: string;
  label: string | null;
  config: Record<string, unknown> | null;
  is_primary: boolean;
  created_at: string;
};

type FieldDef = {
  key: string; // config key or "secret"
  label: string;
  placeholder: string;
  secret?: boolean;
  optional?: boolean;
};

const PROVIDERS: {
  id: string;
  label: string;
  description: string;
  group: "ai" | "jobs";
  fields: FieldDef[];
}[] = [
  // ── AI providers ──
  {
    id: "ai_openai",
    label: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, o-series models",
    group: "ai",
    fields: [
      { key: "secret", label: "API key", placeholder: "sk-...", secret: true },
      { key: "model", label: "Model (optional)", placeholder: "gpt-4o-mini", optional: true },
      { key: "embedding_model", label: "Embedding model (optional)", placeholder: "text-embedding-3-small", optional: true },
    ],
  },
  {
    id: "ai_gemini",
    label: "Google Gemini",
    description: "gemini-3.5-flash-lite and other Gemini models",
    group: "ai",
    fields: [
      { key: "secret", label: "API key", placeholder: "AIza...", secret: true },
      { key: "model", label: "Model (optional)", placeholder: "gemini-3.5-flash-lite", optional: true },
      { key: "embedding_model", label: "Embedding model (optional)", placeholder: "gemini-embedding-001", optional: true },
    ],
  },
  {
    id: "ai_custom",
    label: "Custom (OpenAI-compatible)",
    description: "Any OpenAI-compatible endpoint — Groq, Together, local LLM…",
    group: "ai",
    fields: [
      { key: "secret", label: "API key", placeholder: "your-key", secret: true },
      { key: "base_url", label: "Base URL", placeholder: "https://your-endpoint/v1" },
      { key: "model", label: "Model", placeholder: "model-name" },
      { key: "embedding_model", label: "Embedding model (optional)", placeholder: "embed-model", optional: true },
    ],
  },
  // ── Job providers ──
  {
    id: "adzuna",
    label: "Adzuna",
    description: "Millions of jobs across 20+ countries",
    group: "jobs",
    fields: [
      { key: "app_id", label: "App ID", placeholder: "your-app-id" },
      { key: "secret", label: "API key", placeholder: "your-api-key", secret: true },
    ],
  },
  {
    id: "jooble",
    label: "Jooble",
    description: "Job search API with global coverage",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "jooble-api-key", secret: true }],
  },
  {
    id: "tavily",
    label: "Tavily",
    description: "AI web search for job discovery",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "tvly-...", secret: true }],
  },
  {
    id: "dice",
    label: "Dice",
    description: "Tech job board",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "dice-api-key", secret: true }],
  },
  {
    id: "reed",
    label: "Reed",
    description: "UK job board",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "reed-api-key", secret: true }],
  },
  {
    id: "usajobs",
    label: "USAJOBS",
    description: "US federal government jobs",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "usajobs-api-key", secret: true }],
  },
  {
    id: "wellfound",
    label: "Wellfound",
    description: "Startup jobs",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "wellfound-api-key", secret: true }],
  },
  {
    id: "themuse",
    label: "The Muse",
    description: "Company profiles + jobs (optional key)",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "optional", secret: true, optional: true }],
  },
  {
    id: "careerjet",
    label: "Careerjet",
    description: "Job search affiliate API",
    group: "jobs",
    fields: [{ key: "secret", label: "AffID", placeholder: "your-affid", secret: true }],
  },
  {
    id: "lever",
    label: "Lever",
    description: "Application questions for Lever postings",
    group: "jobs",
    fields: [{ key: "secret", label: "API key", placeholder: "lever-api-key", secret: true }],
  },
];

export function IntegrationsManager() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<SavedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalProvider, setModalProvider] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/integrations");
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

  const savedMap = new Map(keys.map((k) => [k.provider, k]));
  const activeProvider = PROVIDERS.find((p) => p.id === modalProvider) ?? null;
  const activeSaved = modalProvider ? savedMap.get(modalProvider) : undefined;

  function openModal(providerId: string) {
    setFormValues({});
    setModalProvider(providerId);
  }

  function closeModal() {
    setModalProvider(null);
    setFormValues({});
  }

  function setField(field: string, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    if (!activeProvider) return;
    const secret = formValues.secret?.trim();
    const allOptional = activeProvider.fields.every((f) => f.optional);
    const secretField = activeProvider.fields.find((f) => f.secret);

    if (secretField && !secret && !allOptional) {
      toast({ title: "API key is required", variant: "destructive" });
      return;
    }
    if (secretField && !secret && allOptional) {
      // Optional provider with empty key → remove existing key
      await remove(activeProvider.id);
      closeModal();
      return;
    }

    const config: Record<string, string> = {};
    for (const f of activeProvider.fields) {
      if (f.secret) continue;
      const v = formValues[f.key]?.trim();
      if (v) config[f.key] = v;
    }
    if (activeProvider.id === "adzuna" && !config.app_id) {
      toast({ title: "Adzuna App ID is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider.id,
          secret: secret || "unused",
          config,
          is_primary: activeProvider.group === "ai" ? true : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast({ title: `${activeProvider.label} key saved` });
      closeModal();
      load();
    } catch (err) {
      toast({
        title: "Failed to save key",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(provider: string) {
    try {
      const res = await fetch(`/api/account/integrations?provider=${provider}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Key removed" });
      load();
    } catch {
      toast({ title: "Failed to remove key", variant: "destructive" });
    }
  }

  const aiProviders = PROVIDERS.filter((p) => p.group === "ai");
  const jobProviders = PROVIDERS.filter((p) => p.group === "jobs");

  function ProviderCard({ p }: { p: (typeof PROVIDERS)[number] }) {
    const saved = savedMap.get(p.id);
    return (
      <Card className={saved ? "border-green-500/40" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">{p.label}</CardTitle>
              {saved && (
                <Badge variant="outline" className="text-green-600 border-green-500/40 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Your key
                </Badge>
              )}
              {saved?.is_primary && p.group === "ai" && (
                <Badge variant="secondary" className="text-xs">primary</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant={saved ? "outline" : "default"}
              className="h-7"
              onClick={() => openModal(p.id)}
            >
              {saved ? "Update" : "Add key"}
            </Button>
          </div>
          <CardDescription className="text-xs">{p.description}</CardDescription>
        </CardHeader>
        {saved && (
          <CardContent className="pt-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive h-7 px-2 text-xs"
              onClick={() => remove(p.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove key
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-5 flex gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Bring your own keys</p>
            <p className="text-muted-foreground text-xs mt-1">
              Add your own AI provider key (OpenAI, Gemini, or any OpenAI-compatible endpoint)
              and job-board API keys. Your keys are encrypted and used only for your requests —
              each user gets their own quota and billing.
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> AI Provider
          <span className="text-xs font-normal text-muted-foreground">
            — powers resume analysis, matching, cover letters, assistant
          </span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aiProviders.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Job Data Providers</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobProviders.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Providers without your key still work if the app has a default configured.
          Public boards (RemoteOK, WeWorkRemotely, Greenhouse, Lever…) need no key.
        </p>
      </div>

      {/* Add / Update key modal */}
      <Dialog open={!!modalProvider} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          {activeProvider && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  {activeSaved ? `Update ${activeProvider.label}` : `Add ${activeProvider.label} key`}
                </DialogTitle>
                <DialogDescription>{activeProvider.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {activeProvider.fields.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">
                      {f.label}
                      {f.optional && (
                        <span className="text-muted-foreground"> (optional)</span>
                      )}
                    </Label>
                    <Input
                      type={f.secret ? "password" : "text"}
                      placeholder={f.placeholder}
                      value={formValues[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="h-9"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeModal} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  {activeSaved ? "Update key" : "Save key"}
                </Button>
              </DialogFooter>

              <p className="text-[11px] text-muted-foreground">
                Stored encrypted. Your key overrides the app default for your account only.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
