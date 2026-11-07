"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: unknown;
  read: boolean;
  created_at: string;
}

function relativeTime(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number | null>(null);

  // Compute "now" after mount to avoid Date.now() during prerender
  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error("Failed to load notifications");
        const json = await res.json();
        setNotifications(json.data?.notifications ?? []);
        setUnreadCount(json.data?.unread_count ?? 0);
      } catch {
        if (!silent) {
          toast({
            title: "Error",
            description: "Could not load notifications",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (ids?: string[], all = false) => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          all || ids?.includes(n.id) ? { ...n, read: true } : n,
        ),
      );
      setUnreadCount((c) => (all ? 0 : Math.max(0, c - (ids?.length ?? 0))));
      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(all ? { all: true } : { ids: ids ?? [] }),
        });
        if (!res.ok) throw new Error("Failed to update notifications");
      } catch {
        toast({
          title: "Error",
          description: "Could not mark notifications as read",
          variant: "destructive",
        });
        fetchNotifications(true);
      }
    },
    [fetchNotifications, toast],
  );

  const handleItemClick = (n: AppNotification) => {
    if (!n.read) markRead([n.id]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => markRead(undefined, true)}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
          <DialogDescription>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2 space-y-1">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n)}
                className="w-full text-left flex gap-3 p-3 rounded-md hover:bg-accent transition-colors"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-primary"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {now ? relativeTime(n.created_at, now) : ""}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
