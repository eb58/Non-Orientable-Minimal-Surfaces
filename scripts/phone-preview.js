import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";

const port = 8000;
const root = process.cwd();
const blockedTopLevel = new Set([".git", ".github", ".agents", ".claude", "android", "remote-worker", "scripts", "test"]);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = normalize(pathname === "/" ? "index.html" : pathname.slice(1));
  const topLevel = relative.split(/[\\/]/)[0];
  if (relative.startsWith("..") || blockedTopLevel.has(topLevel) || topLevel.startsWith(".")) {
    response.writeHead(404).end("Not found");
    return;
  }
  const file = join(root, relative);
  try {
    if (!(await stat(file)).isFile()) throw new Error("not-file");
    response.writeHead(200, { "Content-Type": contentTypes[extname(file).toLowerCase()] || "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Lokaler Server: http://localhost:${port}`);
  console.log("Der öffentliche HTTPS-Link erscheint gleich unter 'trycloudflare.com'.\n");
  const tunnel = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], { stdio: "inherit" });
  tunnel.on("error", error => {
    if (error.code === "ENOENT") {
      console.error("\ncloudflared fehlt. Einmalig installieren mit:");
      console.error("winget install --id Cloudflare.cloudflared");
    } else console.error(error.message);
    server.close();
    process.exitCode = 1;
  });
  tunnel.on("exit", code => {
    server.close();
    if (code) process.exitCode = code;
  });
  const stop = () => {
    tunnel.kill();
    server.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
});
