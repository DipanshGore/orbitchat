import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDayHeader(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && now.getDate() === date.getDate()) {
    return "Today";
  }
  if (diffDays <= 1 && now.getDate() - date.getDate() === 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
  });
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Cosmic avatar helper
export interface PlanetAvatar {
  id: string;
  name: string;
  color: string;
  gradient: string;
}

export const PLANET_AVATARS: PlanetAvatar[] = [
  { id: "sun", name: "Helios (Sun)", color: "#F59E0B", gradient: "from-amber-400 to-yellow-600" },
  { id: "mercury", name: "Mercury", color: "#9CA3AF", gradient: "from-gray-300 to-slate-500" },
  { id: "venus", name: "Venus", color: "#FBBF24", gradient: "from-yellow-200 to-amber-500" },
  { id: "earth", name: "Terra (Earth)", color: "#3B82F6", gradient: "from-sky-400 to-blue-600" },
  { id: "mars", name: "Ares (Mars)", color: "#EF4444", gradient: "from-orange-500 to-red-600" },
  { id: "jupiter", name: "Jupiter", color: "#D97706", gradient: "from-amber-600 to-orange-800" },
  { id: "saturn", name: "Saturn", color: "#EAB308", gradient: "from-yellow-400 to-amber-700" },
  { id: "uranus", name: "Uranus", color: "#06B6D4", gradient: "from-cyan-300 to-teal-500" },
  { id: "neptune", name: "Neptune", color: "#6366F1", gradient: "from-blue-500 to-indigo-700" },
];

export function getPlanetMeta(avatarId: string): PlanetAvatar {
  const match = PLANET_AVATARS.find((p) => p.id === avatarId);
  return match || PLANET_AVATARS[4]!; // Default to Mars
}

