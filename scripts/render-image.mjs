import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const STORAGE_KEY = "minimalSurfaceStateV1";
const raw = process.env.RENDER_REQUEST || "";
const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? raw;
const start = fenced.indexOf("{");
const end = fenced.lastIndexOf("}");
const request = start >= 0 && end >= start ? JSON.parse(fenced.slice(start, end + 1)) : {};
const surface = request.surface;
const state = {
  ...(surface ? { activeSurface: surface } : {}),
  ...(request.material ? { materialMode: request.material } : {}),
  ...(request.background ? { background: request.background } : {})
};
if (surface && request.camera && request.target) state.surfaceViews = { [surface]: { camera: request.camera, target: request.target } };
if (surface && request.objectPosition) state.objectPositions = { [surface]: request.objectPosition };
if (surface && Number.isFinite(request.hammerFactor)) state.hammerFactors = { [surface]: request.hammerFactor };
if (surface && request.domain) state.domains = { [surface]: request.domain };
if (surface && request.parameters) state.parameters = { [surface]: request.parameters };

const width = Math.max(640, Math.min(3840, Number(request.width) || 1600));
const height = Math.max(480, Math.min(2160, Number(request.height) || 1000));
await mkdir("exports", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: STORAGE_KEY, value: state });
await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
await page.waitForSelector("#surface");
await page.waitForFunction(() => document.querySelector("#surface-name")?.textContent?.trim().length > 0);
await page.waitForTimeout(1200);
const downloadPromise = page.waitForEvent("download");
await page.click("#save-image");
const download = await downloadPromise;
await download.saveAs("exports/render.png");
await browser.close();
