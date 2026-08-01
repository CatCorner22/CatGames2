import { useEffect, useRef } from "react";
import { KittenGameEngine } from "./engine";
import type { GameId, GameSettings } from "./types";
import { unlockAudio } from "./audio";

interface Props {
  game: GameId;
  settings: GameSettings;
  onScore: (n: number) => void;
  paused?: boolean;
  className?: string;
}

export function GameCanvas({ game, settings, onScore, paused = false, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<KittenGameEngine | null>(null);
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new KittenGameEngine(canvas, settings, (n) => onScoreRef.current(n));
    engine.setGame(game);
    engine.start();
    engineRef.current = engine;

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; game/settings applied below
  }, []);

  useEffect(() => {
    engineRef.current?.setGame(game);
  }, [game]);

  useEffect(() => {
    engineRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.stop();
    else engine.start();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const rel = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      unlockAudio();
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = rel(e.clientX, e.clientY);
      engine.setPointer({ x, y, down: true, active: true });
    };
    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = rel(e.clientX, e.clientY);
      engine.setPointer({ x, y, active: true, down: (e.buttons & 1) === 1 || e.pressure > 0 });
    };
    const onPointerUp = (e: PointerEvent) => {
      const { x, y } = rel(e.clientX, e.clientY);
      engine.setPointer({ x, y, down: false, active: true });
    };
    const onPointerLeave = () => {
      // `active: false` lets "follow" mode fall back to auto-roam when the
      // stylus/paw leaves the canvas instead of freezing on the last position.
      engine.setPointer({ down: false, active: false });
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [game]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: "crosshair",
      }}
    />
  );
}
