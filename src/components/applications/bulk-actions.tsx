"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Download, Trash2, X } from "lucide-react";
import { useState } from "react";

interface BulkActionProps {
    selectedIds: string[];
    onClear: () => void;
    onRefresh: () => void;
}

const STATUSES = [
    "interested",
    "saved",
    "preparing",
    "applied",
    "assessment",
    "interview",
    "technical_interview",
    "final_interview",
    "offer",
    "rejected",
    "withdrawn",
] as const;

export function BulkActions({ selectedIds, onClear, onRefresh }: BulkActionProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [newStatus, setNewStatus] = useState<string>("");

    async function updateStatus() {
        if (!newStatus || !selectedIds.length) return;

        setLoading(true);
        try {
            const res = await fetch("/api/applications/bulk", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ids: selectedIds,
                    status: newStatus,
                }),
            });

            if (!res.ok) throw new Error("Failed to update");

            toast({
                title: "Status updated",
                description: `${selectedIds.length} applications updated to ${newStatus}`,
            });
            onClear();
            onRefresh();
            setStatusDialogOpen(false);
            setNewStatus("");
        } catch (err) {
            toast({
                title: "Failed to update",
                description: err instanceof Error ? err.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function deleteSelected() {
        setLoading(true);
        try {
            const res = await fetch("/api/applications/bulk", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast({
                title: "Deleted",
                description: `${selectedIds.length} applications deleted`,
            });
            onClear();
            onRefresh();
            setDeleteOpen(false);
        } catch (err) {
            toast({
                title: "Failed to delete",
                description: err instanceof Error ? err.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function exportSelected() {
        try {
            const res = await fetch("/api/applications/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (!res.ok) throw new Error("Failed to export");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast({ title: "Exported", description: `${selectedIds.length} applications exported` });
        } catch (err) {
            toast({
                title: "Export failed",
                description: err instanceof Error ? err.message : "Please try again",
                variant: "destructive",
            });
        }
    }

    if (!selectedIds.length) return null;

    return (
        <>
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
                    <span className="text-sm font-medium">
                        {selectedIds.length} selected
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusDialogOpen(true)}
                            disabled={loading}
                        >
                            Change Status
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void exportSelected()}
                            disabled={loading}
                        >
                            <Download className="h-4 w-4 mr-1" />
                            Export
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                            disabled={loading}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                        </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClear}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Status Change Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Status</DialogTitle>
                        <DialogDescription>
                            Update status for {selectedIds.length} selected applications
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>New Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void updateStatus()} disabled={!newStatus || loading}>
                            {loading ? "Updating..." : "Update"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Applications</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedIds.length} applications? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => void deleteSelected()} disabled={loading}>
                            {loading ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
