export type GameId =
  | "laser"
  | "butterfly"
  | "mouse"
  | "bubbles"
  | "yarn"
  | "fireflies"
  | "fish"
  | "treats"
  | "orion"
  | "eclipse"
  | "comet"
  | "nebula";

export type SpeedMode = "calm" | "playful" | "zoomies";
export type SizeMode = "small" | "medium" | "large";
export type ControlMode = "auto" | "follow" | "mixed";

export interface GameSettings {
  speed: SpeedMode;
  size: SizeMode;
  control: ControlMode;
  sound: boolean;
  softGlow: boolean;
}

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  blurb: string;
  accent: string;
  icon: string;
  series?: "classic" | "space";
}

export const GAME_CATALOG: GameMeta[] = [
  {
    id: "laser",
    name: "Laser Dot",
    tagline: "Classic chase",
    blurb: "A bright soft dot that glides and darts — pure predatory fun without the real laser risk.",
    accent: "#fb7185",
    icon: "target",
    series: "classic",
  },
  {
    id: "butterfly",
    name: "Flutter",
    tagline: "Gentle wings",
    blurb: "A slow butterfly that drifts and zigzags. Perfect for curious kittens learning to bat.",
    accent: "#c4b5fd",
    icon: "butterfly",
    series: "classic",
  },
  {
    id: "mouse",
    name: "Scurry Mouse",
    tagline: "Stop & dash",
    blurb: "A little mouse that freezes, then skitters away. Great for pounce practice.",
    accent: "#fbbf24",
    icon: "mouse",
    series: "classic",
  },
  {
    id: "bubbles",
    name: "Bubble Pond",
    tagline: "Pop & float",
    blurb: "Soft bubbles rise and drift. Touch them and they pop into sparkles — never harsh.",
    accent: "#7dd3fc",
    icon: "bubbles",
    series: "classic",
  },
  {
    id: "yarn",
    name: "Yarn Ball",
    tagline: "Bouncy toy",
    blurb: "A cozy yarn ball that rolls, bounces, and settles. Feels like a real living-room toy.",
    accent: "#fb7185",
    icon: "yarn",
    series: "classic",
  },
  {
    id: "fireflies",
    name: "Firefly Garden",
    tagline: "Twilight glow",
    blurb: "Calm evening lights that pulse and drift. Enriching without overstimulation.",
    accent: "#6ee7b7",
    icon: "sparkle",
    series: "classic",
  },
  {
    id: "fish",
    name: "Pond Fish",
    tagline: "Swim watch",
    blurb: "Colorful fish swim in a soft pond. Some chase the finger; others wander peacefully.",
    accent: "#38bdf8",
    icon: "fish",
    series: "classic",
  },
  {
    id: "treats",
    name: "Surprise Treats",
    tagline: "Appear & vanish",
    blurb: "Friendly treat icons pop in random places, linger, then fade. Short bursts of interest.",
    accent: "#fcd34d",
    icon: "treat",
    series: "classic",
  },
  {
    id: "orion",
    name: "Orion's Belt",
    tagline: "Three bright stars",
    blurb: "Three linked stars drift like Orion's Belt — soft, high-contrast points made for bat practice.",
    accent: "#a5b4fc",
    icon: "orion",
    series: "space",
  },
  {
    id: "eclipse",
    name: "Eclipse Moon",
    tagline: "Soft corona",
    blurb: "A gentle dark moon with a glowing ring. Slow orbits and a calm halo — named for Eclipse.",
    accent: "#fde68a",
    icon: "eclipse",
    series: "space",
  },
  {
    id: "comet",
    name: "Comet Trail",
    tagline: "Tail chase",
    blurb: "A soft comet arcs across the sky with a silky tail. Follow or bat the bright head.",
    accent: "#67e8f9",
    icon: "comet",
    series: "space",
  },
  {
    id: "nebula",
    name: "Nebula Dust",
    tagline: "Glowing clouds",
    blurb: "Puffs of colorful nebula dust drift and pulse. Touch them for quiet sparkles — never harsh.",
    accent: "#e879f9",
    icon: "nebula",
    series: "space",
  },
];

export const DEFAULT_SETTINGS: GameSettings = {
  speed: "playful",
  size: "medium",
  control: "mixed",
  sound: false,
  softGlow: true,
};

export function speedMultiplier(speed: SpeedMode): number {
  switch (speed) {
    case "calm":
      return 0.55;
    case "playful":
      return 1;
    case "zoomies":
      return 1.65;
  }
}

export function sizeMultiplier(size: SizeMode): number {
  switch (size) {
    case "small":
      return 0.72;
    case "medium":
      return 1;
    case "large":
      return 1.45;
  }
}
