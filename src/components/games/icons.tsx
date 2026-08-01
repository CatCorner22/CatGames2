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
    case "orion":
      return (
        <svg {...common}>
          <circle cx="12" cy="28" r="4" fill="currentColor" />
          <circle cx="24" cy="22" r="5" fill="currentColor" />
          <circle cx="36" cy="16" r="4" fill="currentColor" />
          <path d="M12 28L24 22L36 16" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <circle cx="24" cy="22" r="10" fill="currentColor" opacity="0.12" />
        </svg>
      );
    case "eclipse":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="16" fill="currentColor" opacity="0.25" />
          <circle cx="24" cy="24" r="11" fill="#0f1419" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" fill="none" />
        </svg>
      );
    case "comet":
      return (
        <svg {...common}>
          <path d="M8 30c8-4 16-10 28-18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
          <circle cx="36" cy="12" r="6" fill="currentColor" />
          <circle cx="36" cy="12" r="3" fill="#0f1419" opacity="0.25" />
        </svg>
      );
    case "nebula":
      return (
        <svg {...common}>
          <circle cx="18" cy="22" r="12" fill="currentColor" opacity="0.35" />
          <circle cx="30" cy="26" r="10" fill="currentColor" opacity="0.45" />
          <circle cx="24" cy="18" r="7" fill="currentColor" opacity="0.6" />
          <circle cx="22" cy="20" r="2.5" fill="currentColor" />
        </svg>
      );
    case "starshower":
      return (
        <svg {...common}>
          <path d="M10 8l14 16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <path d="M26 6l8 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
          <path d="M26 26l2.4 5.4 5.9.5-4.5 3.9 1.4 5.8-5.2-3.1-5.2 3.1 1.4-5.8-4.5-3.9 5.9-.5L26 26z" fill="currentColor" />
          <circle cx="36" cy="18" r="2.5" fill="currentColor" opacity="0.8" />
        </svg>
      );
    case "saturn":
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="10" fill="currentColor" />
          <ellipse cx="24" cy="24" rx="20" ry="7" stroke="currentColor" strokeWidth="2.5" opacity="0.55" fill="none" />
          <circle cx="41" cy="21" r="2.5" fill="currentColor" opacity="0.9" />
          <circle cx="8" cy="28" r="2" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "aurora":
      return (
        <svg {...common}>
          <path d="M4 16c8-6 14 6 22 0s12-4 18-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.8" fill="none" />
          <path d="M4 27c8-6 14 6 22 0s12-4 18-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.5" fill="none" />
          <path d="M4 38c8-6 14 6 22 0s12-4 18-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.3" fill="none" />
        </svg>
      );
    case "moonmoth":
      return (
        <svg {...common}>
          <path d="M34 8a12 12 0 1 0 8 20 14 14 0 1 1-8-20z" fill="currentColor" opacity="0.5" />
          <ellipse cx="14" cy="30" rx="8" ry="6" fill="currentColor" opacity="0.9" transform="rotate(-18 14 30)" />
          <ellipse cx="26" cy="30" rx="8" ry="6" fill="currentColor" opacity="0.9" transform="rotate(18 26 30)" />
          <ellipse cx="20" cy="31" rx="2.4" ry="6" fill="currentColor" />
        </svg>
      );
    case "constellation":
      return (
        <svg {...common}>
          <path d="M24 40L12 32l-2-14 8-10 6 6 6-6 8 10-2 14-12 8z" stroke="currentColor" strokeWidth="1.5" opacity="0.4" fill="none" />
          <circle cx="24" cy="40" r="3" fill="currentColor" />
          <circle cx="12" cy="32" r="2.5" fill="currentColor" opacity="0.85" />
          <circle cx="10" cy="18" r="2.5" fill="currentColor" opacity="0.85" />
          <circle cx="18" cy="8" r="3" fill="currentColor" />
          <circle cx="24" cy="14" r="2" fill="currentColor" opacity="0.7" />
          <circle cx="30" cy="8" r="3" fill="currentColor" />
          <circle cx="38" cy="18" r="2.5" fill="currentColor" opacity="0.85" />
          <circle cx="36" cy="32" r="2.5" fill="currentColor" opacity="0.85" />
        </svg>
      );
    case "lunabounce":
      return (
        <svg {...common}>
          <circle cx="24" cy="20" r="12" fill="currentColor" />
          <circle cx="20" cy="17" r="3" fill="#0f1419" opacity="0.25" />
          <circle cx="28" cy="24" r="2.2" fill="#0f1419" opacity="0.2" />
          <path d="M10 40c4 3 8 4 14 4s10-1 14-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" fill="none" />
        </svg>
      );
    case "phoenix":
      return (
        <svg {...common}>
          <path d="M6 20a20 20 0 0 1 36 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.35" fill="none" />
          <path d="M10 20a16 16 0 0 1 28 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" fill="none" />
          <ellipse cx="24" cy="30" rx="9" ry="6" fill="currentColor" />
          <path d="M15 27c-4-1-7-4-8-8 4 1 7 2 10 5" fill="currentColor" opacity="0.8" />
          <path d="M33 27c4-1 7-4 8-8-4 1-7 2-10 5" fill="currentColor" opacity="0.8" />
          <path d="M24 36c-2 4-1 7 0 9 1-2 2-5 0-9z" fill="currentColor" opacity="0.7" />
          <path d="M20 36c-3 3-3 6-2 8 1-2 2-4 4-6z" fill="currentColor" opacity="0.5" />
          <path d="M28 36c3 3 3 6 2 8-1-2-2-4-4-6z" fill="currentColor" opacity="0.5" />
          <circle cx="24" cy="24" r="3.5" fill="currentColor" />
        </svg>
      );
  }
}
