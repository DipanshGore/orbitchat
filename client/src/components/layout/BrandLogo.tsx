"use client";

import React from "react";

export function BrandLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform hover:rotate-12 duration-500"
      >
        {/* Orbital Ring Ellipse */}
        <ellipse
          cx="24"
          cy="24"
          rx="21"
          ry="9"
          transform="rotate(-28 24 24)"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          className="opacity-80"
        />
        {/* Central Planet Sphere */}
        <circle cx="24" cy="24" r="13" fill="var(--accent)" />
        {/* Planet Surface Shadow Accent */}
        <path
          d="M24 11C31.1797 11 37 16.8203 37 24C37 31.1797 31.1797 37 24 37C19.5 37 16.5 34 16.5 28C16.5 22 19 11 24 11Z"
          fill="var(--accent-contrast)"
          fillOpacity="0.22"
        />
        {/* Orbiting Satellite / Dot */}
        <circle
          cx="40"
          cy="15"
          r="3.5"
          fill="var(--secondary)"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

