"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Play, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { VideoRecorder } from "./video-recorder";

export type VideoIntro = {
  id: string;
  application_id: string | null;
  job_id: string | null;
  duration_seconds: number | null;
  file_size: number | null;
  mime_type: string | null;
  title: string | null;
  created_at: string;
};

function formatDuration(s: number | null) {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoLibrary({
  applicationId,
  jobId,
}: {
  applicationId?: string;
  jobId?: string;
}) {
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoIntro[]>([]);
  const [loading, setLoading] = useState(true);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = applicationId
        ? `?application_id=${applicationId}`
        : "";
      const res = await fetch(`/api/videos${params}`);
      const data = await res.json();
      if (res.ok) setVideos(data.videos ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setVideos((prev) => prev.filter((v) => v.id !== id));
      if (playingId === id) setPlayingId(null);
      toast({ title: "Video deleted" });
    } catch {
      toast({ title: "Failed to delete video", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Video className="h-4 w-4" /> Video Introductions
        </h4>
        <Button size="sm" variant="outline" onClick={() => setRecorderOpen(true)}>
          <Play className="h-3.5 w-3.5 mr-1" /> Record
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : videos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No videos yet. Record a quick intro to stand out.
        </p>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v.id} className="rounded-lg border p-2 space-y-2">
              {playingId === v.id ? (
                <video
                  src={`/api/videos/${v.id}`}
                  controls
                  autoPlay
                  className="w-full rounded bg-black max-h-64"
                  onEnded={() => setPlayingId(null)}
                />
              ) : (
                <button
                  onClick={() => setPlayingId(v.id)}
                  className="w-full flex items-center gap-3 text-left rounded bg-muted/50 p-2 hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {v.title || "Video introduction"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(v.duration_seconds)}
                      {v.file_size ? ` · ${formatSize(v.file_size)}` : ""}
                      {` · ${new Date(v.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </button>
              )}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-destructive hover:text-destructive"
                  onClick={() => remove(v.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoRecorder
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        applicationId={applicationId}
        jobId={jobId}
        onUploaded={load}
      />
    </div>
  );
}
