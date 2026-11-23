"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Hash, Plus, Loader2 } from "lucide-react";
import { useChatStore } from "../../store/chatStore";
import { apiFetch } from "../../lib/api";

export function CreateChannelModal() {
  const router = useRouter();
  const { isCreateChannelOpen, setCreateChannelOpen, fetchChannels } = useChatStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isCreateChannelOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (cleanName.length < 2) {
      setError("Planet / channel name must be at least 2 characters.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await apiFetch<{ channel: { id: string } }>("/api/channels", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          description: description.trim() || undefined,
        }),
      });

      await fetchChannels();
      setCreateChannelOpen(false);
      setName("");
      setDescription("");
      router.push(`/c/${res.channel.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to establish orbital channel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-accent" />
            <h2 className="font-heading text-lg font-bold text-text">Launch New Planet Channel</h2>
          </div>
          <button
            type="button"
            onClick={() => setCreateChannelOpen(false)}
            className="p-1 rounded-full text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">
                #
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="orbital-operations"
                required
                maxLength={40}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            </div>
            <p className="text-[11px] text-muted mt-1">Lowercase alphanumeric and dashes only.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Topic / Mission Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What telemetry, projects, or discussions belong here?"
              maxLength={150}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateChannelOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-text hover:bg-surface-2 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-accent text-accent-contrast hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Launching...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Create Planet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

