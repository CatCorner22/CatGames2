/** Packs the standalone vite build into one self-contained docs/index.html. */
import fs from "node:fs";
import path from "node:path";
import { log } from "node:console";

const dir = "dist-standalone/assets";
const js = fs.readFileSync(path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith(".js"))), "utf8");
const css = fs.readFileSync(path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith(".css"))), "utf8");
const safeJs = js.replace(/<\/script/g, "<\\/script");
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/index.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"/><title>KittenPlay</title><style>html,body{height:100%;margin:0}#kittenplay-root{height:100%}\n${css}</style></head><body><div id="kittenplay-root"></div><script type="module">${safeJs}</script></body></html>`,
);
log("docs/index.html:", fs.statSync("docs/index.html").size, "bytes");
