/**
 * Standalone entry for the single-file playable bundle (Claude artifact / any
 * static host). Mounts the app directly, no router/SSR — the app is a single
 * screen with internal view state, so the router adds nothing here.
 */
import { createRoot } from "react-dom/client";
import { KittenPlayApp } from "./src/routes/index";
import "./src/styles.css";

createRoot(document.getElementById("kittenplay-root")!).render(<KittenPlayApp />);
