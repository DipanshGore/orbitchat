"use client";

import React from "react";

const EMOJI_CATEGORIES = [
  {
    name: "Cosmic",
    emojis: ["🚀", "🛰️", "🌌", "🪐", "✨", "🌟", "☄️", "🛸", "🔭", "🌍", "🌕", "☀️"],
  },
  {
    name: "Standard",
    emojis: ["👍", "❤️", "🔥", "🎉", "👏", "🙌", "😂", "😎", "🤔", "👀", "💯", "🤖"],
  },
  {
    name: "Tech & Ops",
    emojis: ["⚡", "⚙️", "💻", "📡", "🛠️", "⚠️", "✅", "❌", "📌", "🔒", "🔑", "💡"],
  },
];

export function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="glass-panel p-3 shadow-2xl w-72 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 z-40">
      <div className="flex items-center justify-between pb-1 border-b border-border/70">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
          Orbital Glyphs & Emojis
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-text text-xs font-semibold px-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 max-h-56 overflow-y-auto">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.name}>
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
              {cat.name}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {cat.emojis.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface-2 transition-transform hover:scale-125 text-lg flex items-center justify-center min-w-[36px] min-h-[36px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

