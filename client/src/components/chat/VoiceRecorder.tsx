"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { apiFetch } from "../../lib/api";

export function VoiceRecorder({
  onSend,
  onCancel,
}: {
  onSend: (fileUrl: string, durationSec: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Audio recording permission denied or failed:", err);
      onCancel();
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleFinishAndSend = async () => {
    if (!mediaRecorderRef.current || isUploading) return;
    setIsUploading(true);

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      try {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        const formData = new FormData();
        formData.append("file", file);

        const res = await apiFetch<{ url: string }>("/api/upload", {
          method: "POST",
          body: formData,
        });

        await onSend(res.url, seconds);
      } catch (err) {
        console.error("Failed to upload voice note:", err);
      } finally {
        setIsUploading(false);
      }
    };

    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleDiscard = () => {
    stopRecordingCleanup();
    onCancel();
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-surface-2 border border-border w-full animate-in fade-in duration-150">
      <div className="flex items-center gap-2 flex-1">
        <span className="w-3 h-3 rounded-full bg-danger animate-ping" />
        <span className="text-xs font-mono font-bold text-text">
          REC {formatTimer(seconds)}
        </span>
        <span className="text-xs text-muted">Transmitting orbital voice telemetry...</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={isUploading}
          className="p-2 rounded-xl text-muted hover:text-danger hover:bg-surface transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Discard transmission"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleFinishAndSend}
          disabled={isUploading || seconds === 0}
          className="px-3 py-1.5 rounded-xl bg-accent text-accent-contrast font-bold text-xs flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all min-h-[36px]"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" /> Send Voice
            </>
          )}
        </button>
      </div>
    </div>
  );
}

