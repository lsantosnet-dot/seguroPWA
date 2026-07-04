// Gera os ícones PNG do PWA a partir de scripts/icon.svg (roda no build).
import sharp from "sharp";
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "scripts", "icon.svg");
const out = join(root, "public");
mkdirSync(out, { recursive: true });

const targets = [
  { file: "pwa-192x192.png", size: 192 },
  { file: "pwa-512x512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-96x96.png", size: 96 },
];

for (const t of targets) {
  await sharp(src).resize(t.size, t.size).png().toFile(join(out, t.file));
}

// Maskable: o conteúdo precisa caber na "safe zone" (~80% central) — encolhe
// o desenho e preenche o fundo com a cor do tema.
const inner = await sharp(src).resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0f1513" },
})
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile(join(out, "maskable-icon-512x512.png"));

copyFileSync(src, join(out, "favicon.svg"));
console.log("Ícones gerados em /public");
