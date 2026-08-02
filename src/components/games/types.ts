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
  | "nebula"
  | "starshower"
  | "saturn"
  | "aurora"
  | "moonmoth"
  | "constellation"
  | "lunabounce"
  | "ribbon"
  | "walle"
  | "phoenix";

export type SpeedMode = "calm" | "playful" | "zoomies";
export type SizeMode = "small" | "medium" | "large";
export type ControlMode = "auto" | "follow" | "mixed";
export type GameSeries = "classic" | "space" | "family" | "memorial";

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
  series: GameSeries;
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
  {
    id: "starshower",
    name: "Star Shower",
    tagline: "Wishing stars",
    blurb: "Soft shooting stars glide gently down the night sky. Bat one and it bursts into stardust.",
    accent: "#fde047",
    icon: "starshower",
    series: "space",
  },
  {
    id: "saturn",
    name: "Saturn Sparkles",
    tagline: "Ring orbit",
    blurb: "A cozy ringed planet with sparkle moons circling slowly — perfect orbit-tracking practice.",
    accent: "#fdba74",
    icon: "saturn",
    series: "space",
  },
  {
    id: "aurora",
    name: "Aurora Paws",
    tagline: "Sky ribbons",
    blurb: "Calm aurora ribbons wave across the sky while glow orbs drift along them. Ultra low-key.",
    accent: "#5eead4",
    icon: "aurora",
    series: "space",
  },
  {
    id: "moonmoth",
    name: "Moon Moths",
    tagline: "Night flutter",
    blurb: "Gentle glowing moths circle a crescent moon. Tap one and it puffs into moon-dust sparkles.",
    accent: "#d8b4fe",
    icon: "moonmoth",
    series: "space",
  },
  {
    id: "constellation",
    name: "Kitten Constellation",
    tagline: "Connect the stars",
    blurb: "Stars twinkle to life one by one — tap the bright one to draw a kitten across the sky.",
    accent: "#93c5fd",
    icon: "constellation",
    series: "space",
  },
  {
    id: "lunabounce",
    name: "Luna Bounce",
    tagline: "Low gravity",
    blurb: "A soft little moon bounces in slow lunar gravity. Nudge it, chase it, boop it.",
    accent: "#e2e8f0",
    icon: "lunabounce",
    series: "space",
  },
  {
    id: "ribbon",
    name: "Stardust Ribbon",
    tagline: "Wand-toy magic",
    blurb: "A silky ribbon of starlight swims through the sky. Bat the glowing tassel — or drag a stylus and play wand-toy together.",
    accent: "#f0abfc",
    icon: "ribbon",
    series: "space",
  },
  {
    id: "walle",
    name: "Walle's Chirp Chase",
    tagline: "Play by ear 💙",
    blurb:
      "A friendly cricket sings somewhere on screen, and its chirp comes from that side of the speakers — so Walle, blind and brave, can hunt it entirely by ear. Chirps stay on in this game even when other sounds are off, and the whole area around the critter counts as a catch.",
    accent: "#a3e635",
    icon: "walle",
    series: "family",
  },
  {
    id: "phoenix",
    name: "Phoenix's Rainbow Bridge",
    tagline: "For Phoenix ❤",
    blurb:
      "Catch vanishing treats and catnip in the Sedona desert before tumbleweeds roll them away, while Phoenix himself — a green-eyed tabby on flame wings, drawn from his photo — soars beneath the rainbow bridge. In loving memory of Phoenix — five bright years.",
    accent: "#fb923c",
    icon: "phoenix",
    series: "memorial",
  },
];

export const DEFAULT_SETTINGS: GameSettings = {
  speed: "playful",
  size: "medium",
  control: "mixed",
  sound: true,
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
