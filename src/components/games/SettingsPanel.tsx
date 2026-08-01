import { Volume2, VolumeX, Sparkles } from "lucide-react";
import type { ControlMode, GameSettings, SizeMode, SpeedMode } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  className?: string;
}

function Chip<T extends string>({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm font-medium transition-colors min-h-11",
        active
          ? "bg-primary text-primary-fg shadow-sm"
          : "bg-surface-elevated text-muted hover:text-fg border border-border",
      )}
    >
      {label}
    </button>
  );
}

export function SettingsPanel({ settings, onChange, className }: Props) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className={cn("space-y-5", className)}>
      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-2.5 font-semibold">Energy</h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["calm", "Calm"],
              ["playful", "Playful"],
              ["zoomies", "Zoomies"],
            ] as [SpeedMode, string][]
          ).map(([id, label]) => (
            <Chip key={id} active={settings.speed === id} label={label} onClick={() => set("speed", id)} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Calm for timid kittens · Playful for daily enrichment · Zoomies for high-energy sessions
        </p>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-2.5 font-semibold">Target size</h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["small", "Small"],
              ["medium", "Medium"],
              ["large", "Large"],
            ] as [SizeMode, string][]
          ).map(([id, label]) => (
            <Chip key={id} active={settings.size === id} label={label} onClick={() => set("size", id)} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-2.5 font-semibold">How it moves</h3>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["auto", "Auto roam"],
              ["follow", "Follow stylus"],
              ["mixed", "Mixed"],
            ] as [ControlMode, string][]
          ).map(([id, label]) => (
            <Chip key={id} active={settings.control === id} label={label} onClick={() => set("control", id)} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Auto roam is perfect for hands-free tablet play. Follow uses your XP-Pen stylus or finger as the
          leader. Mixed roams until you touch, then follows.
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => set("sound", !settings.sound)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium min-h-11 border border-border",
            settings.sound ? "bg-primary text-primary-fg" : "bg-surface-elevated text-muted",
          )}
        >
          {settings.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          Soft sounds {settings.sound ? "on" : "off"}
        </button>
        <button
          type="button"
          onClick={() => set("softGlow", !settings.softGlow)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium min-h-11 border border-border",
            settings.softGlow ? "bg-primary text-primary-fg" : "bg-surface-elevated text-muted",
          )}
        >
          <Sparkles className="size-4" />
          Soft vignette {settings.softGlow ? "on" : "off"}
        </button>
      </section>
    </div>
  );
}
