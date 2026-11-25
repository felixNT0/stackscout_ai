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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Camera, Circle, Square, Upload, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId?: string;
  jobId?: string;
  onUploaded?: () => void;
};

type Stage = "setup" | "preview" | "recording" | "review" | "uploading";

export function VideoRecorder({
  open,
  onOpenChange,
  applicationId,
  jobId,
  onUploaded,
}: Props) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stage, setStage] = useState<Stage>("setup");
  const [error, setError] = useState<string | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  }, [recordedUrl]);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      setCameraReady(true);
      setStage("preview");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Camera access failed: ${err.message}. Check browser permissions.`
          : "Camera access denied",
      );
    }
  }, []);

  // Auto-start camera when dialog opens
  useEffect(() => {
    if (open && stage === "setup" && !cameraReady) {
      startCamera();
    }
    if (!open) {
      // Reset state when closed
      cleanup();
      setStage("setup");
      setRecordedUrl(null);
      setRecordedBlob(null);
      setDuration(0);
      setTitle("");
      setCameraReady(false);
      setError(null);
      chunksRef.current = [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setStage("review");
      // Switch video to playback
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = false;
        videoRef.current.controls = true;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    recorderRef.current = recorder;
    recorder.start(1000); // collect chunks every second
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    setStage("recording");
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const retry = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    setRecordedUrl(null);
    setRecordedBlob(null);
    setDuration(0);
    setCameraReady(false);
    setStage("setup");
    startCamera();
  }, [cleanup, startCamera]);

  const upload = useCallback(async () => {
    if (!recordedBlob) return;
    setStage("uploading");
    try {
      const formData = new FormData();
      const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      formData.append("file", recordedBlob, `intro.${ext}`);
      if (applicationId) formData.append("application_id", applicationId);
      if (jobId) formData.append("job_id", jobId);
      if (title.trim()) formData.append("title", title.trim());
      formData.append("duration_seconds", String(duration));

      const res = await fetch("/api/videos", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      toast({ title: "Video introduction uploaded" });
      onUploaded?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
      setStage("review");
    }
  }, [recordedBlob, applicationId, jobId, title, duration, toast, onUploaded, onOpenChange]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" /> Record Video Introduction
          </DialogTitle>
          <DialogDescription>
            Record a short intro video to attach to this application. Max 100MB,
            webm/mp4 supported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video preview */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={stage !== "review"}
              className="w-full h-full object-cover"
            />
            {stage === "recording" && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded">
                <Circle className="h-3 w-3 fill-current animate-pulse" />
                REC {formatTime(duration)}
              </div>
            )}
            {stage === "preview" && (
              <div className="absolute bottom-3 left-3 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                Camera ready — click record when ready
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title input (review stage) */}
          {(stage === "review" || stage === "uploading") && (
            <div>
              <Label htmlFor="video-title">Title (optional)</Label>
              <Input
                id="video-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Intro for Senior Engineer role"
                className="mt-1"
                disabled={stage === "uploading"}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {stage === "setup" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {stage === "preview" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700">
                <Camera className="h-4 w-4 mr-1" /> Start Recording
              </Button>
            </>
          )}

          {stage === "recording" && (
            <Button onClick={stopRecording} variant="destructive">
              <Square className="h-4 w-4 mr-1" /> Stop ({formatTime(duration)})
            </Button>
          )}

          {stage === "review" && (
            <>
              <Button variant="outline" onClick={retry}>
                Re-record
              </Button>
              <Button onClick={upload}>
                <Upload className="h-4 w-4 mr-1" /> Upload Video
              </Button>
            </>
          )}

          {stage === "uploading" && (
            <Button disabled>
              <Upload className="h-4 w-4 mr-1 animate-pulse" /> Uploading…
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
