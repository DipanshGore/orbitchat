"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { PLANET_AVATARS } from "../../lib/utils";
import { AvatarRing } from "../layout/AvatarRing";
import { UserStatus } from "../../types";

export function IdentityModal() {
  const {
    user,
    isIdentityModalOpen,
    setIdentityModalOpen,
    updateProfile,
    soundEnabled,
    setSoundEnabled,
  } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || "mars");
  const [status, setStatus] = useState<UserStatus>(user?.status || "online");
  const [customStatus, setCustomStatus] = useState(user?.customStatus || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setSelectedAvatar(user.avatar || "mars");
      setStatus(user.status || "online");
      setCustomStatus(user.customStatus || "");
    }
  }, [user, isIdentityModalOpen]);

  if (!isIdentityModalOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || user.username,
        avatar: selectedAvatar,
        status,
        customStatus: customStatus.trim() || null,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIdentityModalOpen(false);
      }, 600);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-heading text-lg font-bold text-text">Orbital Identity Matrix</h2>
          </div>
          <button
            type="button"
            onClick={() => setIdentityModalOpen(false)}
            className="p-1 rounded-full text-muted hover:text-text hover:bg-surface-2 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live Preview Card */}
          <div className="p-4 rounded-xl bg-surface-2 border border-border flex items-center gap-4">
            <AvatarRing
              avatar={selectedAvatar}
              status={status}
              size={56}
              showStatusDot
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-text truncate">
                  {displayName || "Unnamed Astronaut"}
                </span>
                <span className="text-xs text-muted">@{user.username}</span>
              </div>
              <p className="text-xs text-muted truncate mt-0.5">
                {customStatus ? `"${customStatus}"` : `Status: ${status}`}
              </p>
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Callsign / Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Commander Nova"
              required
              maxLength={40}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Planet Avatar Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Cosmic Origin / Planet Avatar
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {PLANET_AVATARS.map((p) => {
                const isSelected = selectedAvatar === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedAvatar(p.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center min-h-[68px] ${
                      isSelected
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${p.gradient} shadow flex items-center justify-center text-[10px] font-bold text-white uppercase`}
                    >
                      {p.name.slice(0, 1)}
                    </div>
                    <span className="text-[11px] font-medium text-text truncate w-full">
                      {p.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Telemetry Status Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Orbital Status Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["online", "away", "busy"] as UserStatus[]).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize flex items-center justify-center gap-2 transition-all min-h-[44px] ${
                    status === st
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted hover:text-text hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      st === "online" ? "bg-success" : st === "away" ? "bg-amber-400" : "bg-danger"
                    }`}
                  />
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Status Text with clear button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Custom Mission Status
              </label>
              {customStatus && (
                <button
                  type="button"
                  onClick={() => setCustomStatus("")}
                  className="text-xs text-muted hover:text-danger underline"
                >
                  Clear Status
                </button>
              )}
            </div>
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. Aligning telemetry vectors 🛰️"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Sound Notification Chime Setting */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-text block">Orbital Web Audio Chime</span>
              <span className="text-xs text-muted block">Play crystal audio chime for inactive chats</span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] ${
                soundEnabled
                  ? "bg-accent/15 border-accent text-accent"
                  : "bg-surface-2 border-border text-muted"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/70 bg-surface/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setIdentityModalOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-text hover:bg-surface-2 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-accent text-accent-contrast hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 min-h-[44px]"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" /> Updated
              </>
            ) : isSaving ? (
              "Updating..."
            ) : (
              "Save Identity"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

