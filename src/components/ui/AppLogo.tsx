import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function AppLogo({ className = 'w-9 h-9', size, color = '#10b981' }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Top Handle */}
      <path
        d="M36 28V20C36 15.5817 39.5817 12 44 12H56C60.4183 12 64 15.5817 64 20V28"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main Suitcase Body */}
      <rect
        x="12"
        y="28"
        width="76"
        height="60"
        rx="16"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Vertical Band */}
      <line
        x1="36"
        y1="28"
        x2="36"
        y2="88"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Right Vertical Band */}
      <line
        x1="64"
        y1="28"
        x2="64"
        y2="88"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
