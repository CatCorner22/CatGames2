import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Cat,
  Clock3,
  Fullscreen,
  Github,
  Maximize2,
  Pause,
  Play,
  Settings2,
  Sparkles,
} from "lucide-react";
import { GameCanvas } from "@/components/games/GameCanvas";
import { GameGlyph } from "@/components/games/icons";
import { SettingsPanel } from "@/components/games/SettingsPanel";
import {
  DEFAULT_SETTINGS,
  GAME_CATALOG,
  type GameId,
  type GameSettings,
} from "@/components/games/types";
import { setSoundEnabled, unlockAudio } from "@/components/games/audio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: KittenPlayApp,
});

type View = "hub" | "play" | "settings" | "about";

const STORAGE_KEY = "kittenplay-settings-v1";

function loadSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function KittenPlayApp() {
  const [view, setView] = useState<View>("hub");
  const [returnTo, setReturnTo] = useState<View>("hub");
  const [game, setGame] = useState<GameId>("laser");
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [score, setScore] = useState(0);
  const [sessionSec, setSessionSec] = useState(0);
  const [paused, setPaused] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSoundEnabled(settings.sound);
  }, [settings, hydrated]);

  useEffect(() => {
    if (view !== "play" || paused) return;
    const id = window.setInterval(() => setSessionSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [view, paused]);

  useEffect(() => {
    if (view !== "play") {
      setChromeHidden(false);
      return;
    }
    const t = window.setTimeout(() => setChromeHidden(true), 3500);
    return () => clearTimeout(t);
  }, [view, game]);

  const meta = useMemo(() => GAME_CATALOG.find((g) => g.id === game)!, [game]);

  const openSettings = useCallback((from: View) => {
    setReturnTo(from);
    setView("settings");
  }, []);

  const startGame = useCallback((id: GameId) => {
    unlockAudio();
    setGame(id);
    setScore(0);
    setSessionSec(0);
    setPaused(false);
    setChromeHidden(false);
    setView("play");
  }, []);

  const restReminder = sessionSec > 0 && sessionSec % 180 === 0 && sessionSec >= 180;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) await el.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
  };

  if (view === "play") {
    return (
      <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
        <div className={cn("absolute inset-0", paused && "opacity-40 pointer-events-none")}>
          {!paused && (
            <GameCanvas
              key={game}
              game={game}
              settings={settings}
              onScore={setScore}
              className="h-full w-full"
            />
          )}
          {paused && (
            <div className="flex h-full items-center justify-center bg-bg">
              <div className="text-center space-y-3 px-6">
                <Pause className="mx-auto size-10 text-primary" />
                <p className="text-xl font-semibold">Paused rest</p>
                <p className="text-muted text-sm max-w-xs">
                  Short breaks keep play enriching, not overstimulating.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Show controls"
          className="absolute inset-x-0 top-0 h-14 z-20"
          onClick={() => setChromeHidden(false)}
        />

        <header
          className={cn(
            "absolute inset-x-0 top-0 z-30 safe-pad flex items-start justify-between gap-3 transition-opacity duration-300",
            chromeHidden ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("hub")}
              className="inline-flex items-center gap-2 rounded-full bg-surface/90 backdrop-blur border border-border px-3.5 py-2.5 text-sm font-medium min-h-11 shadow-lg"
            >
              <ArrowLeft className="size-4" />
              Games
            </button>
            <div className="rounded-full bg-surface/90 backdrop-blur border border-border px-3.5 py-2.5 text-sm shadow-lg">
              <span className="text-muted">Bats</span>{" "}
              <span className="font-semibold text-primary tabular-nums">{score}</span>
            </div>
            <div className="rounded-full bg-surface/90 backdrop-blur border border-border px-3.5 py-2.5 text-sm shadow-lg inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-muted" />
              <span className="tabular-nums">{fmt(sessionSec)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full bg-surface/90 backdrop-blur border border-border p-2.5 min-h-11 min-w-11 shadow-lg"
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button
              type="button"
              onClick={enterFullscreen}
              className="rounded-full bg-surface/90 backdrop-blur border border-border p-2.5 min-h-11 min-w-11 shadow-lg"
              aria-label="Fullscreen"
            >
              <Maximize2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => openSettings("play")}
              className="rounded-full bg-surface/90 backdrop-blur border border-border p-2.5 min-h-11 min-w-11 shadow-lg"
              aria-label="Settings"
            >
              <Settings2 className="size-4" />
            </button>
          </div>
        </header>

        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 safe-pad transition-opacity duration-300",
            chromeHidden ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <div className="mx-auto max-w-3xl rounded-2xl bg-surface/90 backdrop-blur border border-border px-4 py-3 shadow-xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold" style={{ color: meta.accent }}>
                  {meta.name}
                </p>
                <p className="text-xs text-muted">
                  {meta.tagline} · touch or stylus · auto-hides controls
                </p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto max-w-full pb-0.5">
                {GAME_CATALOG.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => startGame(g.id)}
                    className={cn(
                      "shrink-0 rounded-xl px-3 py-2 text-xs font-medium border min-h-10",
                      g.id === game
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-surface-elevated text-muted",
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            {restReminder && (
              <p className="mt-2 text-xs text-accent flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                Nice session — a 1–2 minute rest keeps kittens happy and safe.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "settings") {
    return (
      <div className="h-dvh overflow-y-auto bg-bg text-fg safe-pad">
        <div className="mx-auto max-w-lg py-4 space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView(returnTo === "settings" ? "hub" : returnTo)}
              className="rounded-full border border-border bg-surface p-2.5 min-h-11 min-w-11"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Play settings</h1>
              <p className="text-sm text-muted">Tuned for tablets & curious kittens</p>
            </div>
          </div>
          <SettingsPanel settings={settings} onChange={setSettings} />
          <button
            type="button"
            onClick={() => setView(returnTo === "settings" ? "hub" : returnTo)}
            className="w-full rounded-2xl bg-primary text-primary-fg font-semibold py-3.5 min-h-12"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (view === "about") {
    return (
      <div className="h-dvh overflow-y-auto bg-bg text-fg safe-pad">
        <div className="mx-auto max-w-lg py-4 space-y-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("hub")}
              className="rounded-full border border-border bg-surface p-2.5 min-h-11 min-w-11"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h1 className="text-xl font-semibold">About KittenPlay</h1>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 text-sm leading-relaxed text-muted">
            <p className="text-fg font-medium">Built for enrichment — not overstimulation.</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>Soft motion, no strobing, no jump-scare sounds</li>
              <li>Large, high-contrast targets kittens can track and bat</li>
              <li>Stylus / finger / paw friendly for XP-Pen and tablets</li>
              <li>Auto-roam modes for hands-free play sessions</li>
              <li>Install as an app from your browser (Add to Home Screen)</li>
              <li>Keep sessions short; end on a “win” and offer a real toy after</li>
            </ul>
            <p>
              Source lives on GitHub at{" "}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href="https://github.com/CatCorner22/CatGames"
                target="_blank"
                rel="noreferrer"
              >
                CatCorner22/CatGames
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-y-auto bg-bg text-fg">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #5eead4 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute top-32 -left-20 size-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #c4b5fd 0%, transparent 70%)" }}
        />

        <header className="safe-pad pt-6 pb-2">
          <div className="mx-auto max-w-3xl flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted mb-3">
                <Cat className="size-3.5 text-primary" />
                Kitten enrichment suite
              </div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg">
                Kitten<span className="text-primary">Play</span>
              </h1>
              <p className="mt-2 text-muted max-w-md text-sm sm:text-base leading-relaxed">
                Stable, gentle, stimulating games for curious kittens — tuned for XP-Pen tablets,
                soft motion, and short enriching sessions.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openSettings("hub")}
                className="rounded-full border border-border bg-surface p-2.5 min-h-11 min-w-11"
                aria-label="Settings"
              >
                <Settings2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("about")}
                className="rounded-full border border-border bg-surface p-2.5 min-h-11 min-w-11"
                aria-label="About"
              >
                <Github className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="safe-pad pb-10 pt-4">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
                Game series
              </h2>
              <button
                type="button"
                onClick={() => startGame("laser")}
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-fg px-4 py-2.5 text-sm font-semibold min-h-11 shadow-md shadow-primary/20"
              >
                <Play className="size-4" />
                Quick start
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GAME_CATALOG.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => startGame(g.id)}
                  className="group text-left rounded-2xl border border-border bg-surface p-4 sm:p-5 hover:border-primary/40 hover:bg-surface-elevated transition-colors min-h-[7.5rem] shadow-sm"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="shrink-0 rounded-2xl size-14 flex items-center justify-center border border-border"
                      style={{ background: `${g.accent}22`, color: g.accent }}
                    >
                      <GameGlyph id={g.id} className="size-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-lg truncate">{g.name}</h3>
                        <Fullscreen className="size-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs font-medium mt-0.5" style={{ color: g.accent }}>
                        {g.tagline}
                      </p>
                      <p className="mt-1.5 text-sm text-muted leading-snug line-clamp-2">{g.blurb}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                Tablet tips (XP-Pen friendly)
              </h3>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-muted">
                <li className="rounded-xl bg-bg/50 border border-border px-3 py-2.5">
                  Lay tablet flat · use a mat or case edge so it doesn’t slide
                </li>
                <li className="rounded-xl bg-bg/50 border border-border px-3 py-2.5">
                  Start on <span className="text-fg">Calm</span> energy for new kittens
                </li>
                <li className="rounded-xl bg-bg/50 border border-border px-3 py-2.5">
                  Prefer <span className="text-fg">Auto roam</span> so you can supervise hands-free
                </li>
                <li className="rounded-xl bg-bg/50 border border-border px-3 py-2.5">
                  Install via browser “Add to Home Screen” for a full-screen app
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
