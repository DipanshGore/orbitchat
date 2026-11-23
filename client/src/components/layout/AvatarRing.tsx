"use client";

import React from "react";
import { getPlanetMeta } from "../../lib/utils";
import { UserStatus } from "../../types";

export function AvatarRing({
  avatar = "mars",
  status = "offline",
  size = 40,
  showStatusDot = true,
  className = "",
}: {
  avatar?: string;
  status?: UserStatus;
  size?: number;
  showStatusDot?: boolean;
  className?: string;
}) {
  const planet = getPlanetMeta(avatar);
  const isOnline = status === "online";
  const isAway = status === "away";
  const isBusy = status === "busy";

  // Ring color: accent ring = online, muted = offline, secondary or amber for away/busy
  const ringColor = isOnline
    ? "border-accent shadow-[0_0_8px_rgba(255,138,76,0.45)]"
    : isAway
    ? "border-amber-500"
    : isBusy
    ? "border-danger"
    : "border-border";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full border-2 p-[2px] transition-all duration-300 ${ringColor} ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`w-full h-full rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-inner bg-gradient-to-tr ${planet.gradient} text-white`}
      >
        {planet.name.slice(0, 2)}
      </div>

      {showStatusDot && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
            isOnline
              ? "bg-success"
              : isAway
              ? "bg-amber-400"
              : isBusy
              ? "bg-danger"
              : "bg-muted"
          }`}
        />
      )}
    </div>
  );
}

