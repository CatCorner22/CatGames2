import type { GameId } from "./types";

export function GameGlyph({ id, className = "size-7" }: { id: GameId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  switch (id) {
    case "laser":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="8" fill="currentColor" opacity="0.9" />
          <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="2" opacity="0.35" />
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
        </svg>
      );
    case "butterfly":
      return (
        <svg {...common}>
          <ellipse cx="14" cy="18" rx="10" ry="12" fill="currentColor" opacity="0.85" transform="rotate(-20 14 18)" />
          <ellipse cx="34" cy="18" rx="10" ry="12" fill="currentColor" opacity="0.85" transform="rotate(20 34 18)" />
          <ellipse cx="16" cy="30" rx="8" ry="10" fill="currentColor" opacity="0.55" transform="rotate(-10 16 30)" />
          <ellipse cx="32" cy="30" rx="8" ry="10" fill="currentColor" opacity="0.55" transform="rotate(10 32 30)" />
          <rect x="22" y="14" width="4" height="22" rx="2" fill="currentColor" />
        </svg>
      );
    case "mouse":
      return (
        <svg {...common}>
          <ellipse cx="26" cy="26" rx="14" ry="10" fill="currentColor" />
          <circle cx="14" cy="18" r="6" fill="currentColor" opacity="0.85" />
          <circle cx="14" cy="18" r="3" fill="currentColor" opacity="0.4" />
          <path d="M38 28c6 2 8 8 6 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          <circle cx="30" cy="24" r="2" fill="#0f1419" />
        </svg>
      );
    case "bubbles":
      return (
        <svg {...common}>
          <circle cx="18" cy="28" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.9" />
          <circle cx="32" cy="16" r="7" stroke="currentColor" strokeWidth="2" opacity="0.7" />
          <circle cx="34" cy="32" r="5" stroke="currentColor" strokeWidth="2" opacity="0.55" />
          <circle cx="15" cy="24" r="2" fill="currentColor" opacity="0.5" />
        </svg>
      );
    case "yarn":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="14" fill="currentColor" />
          <path
            d="M12 20c8 2 16-2 24 2M12 28c8-2 16 2 24-1M18 12c2 8-1 16 2 22M30 12c-1 8 2 16-1 22"
            stroke="#0f1419"
            strokeWidth="1.6"
            opacity="0.35"
          />
        </svg>
      );
    case "fireflies":
      return (
        <svg {...common}>
          <circle cx="16" cy="20" r="4" fill="currentColor" />
          <circle cx="30" cy="14" r="3" fill="currentColor" opacity="0.75" />
          <circle cx="28" cy="32" r="5" fill="currentColor" opacity="0.9" />
          <circle cx="16" cy="20" r="10" fill="currentColor" opacity="0.15" />
          <circle cx="28" cy="32" r="12" fill="currentColor" opacity="0.12" />
        </svg>
      );
    case "fish":
      return (
        <svg {...common}>
          <ellipse cx="26" cy="24" rx="12" ry="8" fill="currentColor" />
          <path d="M14 24l-8-7v14l8-7z" fill="currentColor" opacity="0.85" />
          <circle cx="32" cy="22" r="2" fill="#0f1419" />
        </svg>
      );
    case "treats":
      return (
        <svg {...common}>
          <path
            d="M24 8l3.5 9.5H37l-7.5 5.8 2.9 9.7L24 27.2 15.6 33l2.9-9.7L11 17.5h9.5L24 8z"
            fill="currentColor"
          />
        </svg>
      );
  }
}
