"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Bookmark, Loader2, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SavedSearch {
    id: string;
    name: string;
    query: string;
    filters: Record<string, unknown>;
    frequency: string;
    last_run: string | null;
    created_at: string;
}

export function SavedSearches() {
    const { toast } = useToast();
    const router = useRouter();
    const [searches, setSearches] = useState<SavedSearch[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSearch, setNewSearch] = useState({
        name: "",
        query: "",
        frequency: "daily",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/alerts");
                const data = await res.json();
                setSearches(data.data?.alerts ?? []);
            } catch {
                toast({ title: "Failed to load saved searches", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [toast]);

    async function saveSearch() {
        if (!newSearch.name || !newSearch.query) {
            toast({ title: "Name and query are required", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSearch.name,
                    query: newSearch.query,
                    filters: {},
                    frequency: newSearch.frequency,
                }),
            });

            if (!res.ok) throw new Error("Failed to save search");

            toast({ title: "Search saved!" });
            setNewSearch({ name: "", query: "", frequency: "daily" });
            // Reload searches
            const refreshRes = await fetch("/api/alerts");
            const refreshData = await refreshRes.json();
            setSearches(refreshData.data?.alerts ?? []);
        } catch (err) {
            toast({
                title: "Failed to save",
                description: err instanceof Error ? err.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function deleteSearch(id: string) {
        try {
            const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");

            toast({ title: "Search deleted" });
            // Reload searches
            const refreshRes = await fetch("/api/alerts");
            const refreshData = await refreshRes.json();
            setSearches(refreshData.data?.alerts ?? []);
        } catch {
            toast({ title: "Failed to delete", variant: "destructive" });
        }
    }

    async function runSearch(search: SavedSearch) {
        // Navigate to search with the saved query
        router.push(`/dashboard/search?q=${encodeURIComponent(search.query)}`);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Save a Search</CardTitle>
                    <CardDescription>
                        Save your search queries to run them quickly later
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="searchName">Search Name</Label>
                            <Input
                                id="searchName"
                                placeholder="e.g. Remote React Jobs"
                                value={newSearch.name}
                                onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="frequency">Frequency</Label>
                            <Select
                                value={newSearch.frequency}
                                onValueChange={(v) => setNewSearch({ ...newSearch, frequency: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="twice_daily">Twice Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="searchQuery">Search Query</Label>
                        <Input
                            id="searchQuery"
                            placeholder="e.g. react developer remote"
                            value={newSearch.query}
                            onChange={(e) => setNewSearch({ ...newSearch, query: e.target.value })}
                        />
                    </div>
                    <Button onClick={() => void saveSearch()} disabled={saving} className="w-full">
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Bookmark className="h-4 w-4 mr-2" />
                                Save Search
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {searches.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Saved Searches</h3>
                    {searches.map((search) => (
                        <Card key={search.id}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium">{search.name}</h4>
                                            <Badge variant="secondary" className="text-xs">
                                                {search.frequency}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{search.query}</p>
                                        {search.last_run && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Last run: {new Date(search.last_run).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void runSearch(search)}
                                        >
                                            <Play className="h-4 w-4 mr-1" />
                                            Run
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => void deleteSearch(search.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
