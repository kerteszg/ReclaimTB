import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

function cleanDist() {
  if (existsSync(dist)) {
    rmSync(dist, { recursive: true, force: true });
  }
  mkdirSync(dist, { recursive: true });
}

function copyStatic() {
  // manifest
  const manifest = JSON.parse(readFileSync(join(root, "src/manifest.json"), "utf8"));
  writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

  // locales
  cpSync(join(root, "src/_locales"), join(dist, "_locales"), { recursive: true });

  // UI HTML/CSS (and any non-TS assets)
  const uiDirs = ["popup", "event-editor", "task-editor", "settings"];
  for (const dir of uiDirs) {
    const srcDir = join(root, "src/ui", dir);
    const outDir = join(dist, "ui", dir);
    mkdirSync(outDir, { recursive: true });
    cpSync(srcDir, outDir, {
      recursive: true,
      filter: (src) => !src.endsWith(".ts"),
    });
  }

  // shared styles
  const sharedSrc = join(root, "src/ui/shared");
  const sharedOut = join(dist, "ui/shared");
  mkdirSync(sharedOut, { recursive: true });
  cpSync(sharedSrc, sharedOut, {
    recursive: true,
    filter: (src) => !src.endsWith(".ts"),
  });

  // icons if present
  const iconsSrc = join(root, "src/icons");
  if (existsSync(iconsSrc)) {
    cpSync(iconsSrc, join(dist, "icons"), { recursive: true });
  }
}

// Keys are output basenames (esbuild appends .js when outExtension/default applies)
const entryPoints = {
  background: join(root, "src/background/index.ts"),
  "ui/popup/popup": join(root, "src/ui/popup/popup.ts"),
  "ui/event-editor/event-editor": join(root, "src/ui/event-editor/event-editor.ts"),
  "ui/task-editor/task-editor": join(root, "src/ui/task-editor/task-editor.ts"),
  "ui/settings/settings": join(root, "src/ui/settings/settings.ts"),
};

const buildOptions = {
  entryPoints,
  bundle: true,
  outdir: dist,
  format: "iife",
  target: ["firefox128"],
  sourcemap: true,
  logLevel: "info",
  // Thunderbird provides browser/messenger globals; don't try to resolve them
  external: [],
};

async function build() {
  cleanDist();
  copyStatic();

  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching for changes…");
  } else {
    await esbuild.build(buildOptions);
    console.log("Build complete → dist/");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
