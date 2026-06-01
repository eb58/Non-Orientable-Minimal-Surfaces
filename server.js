const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
const port = Number(process.env.PORT || 8765);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const contentType = filePath => mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";

const requestPath = url => {
  const parsed = new URL(url, `http://127.0.0.1:${port}`);
  const decoded = decodeURIComponent(parsed.pathname);
  const normalized = path.normalize(decoded);
  return normalized === path.sep ? "index.html" : normalized.replace(/^[/\\]/, "");
};

const safeFilePath = url => {
  const filePath = path.join(root, requestPath(url));
  return filePath === root || filePath.startsWith(rootWithSeparator) ? filePath : path.join(root, "index.html");
};

const send = (response, status, body, type = "text/plain; charset=utf-8") => {
  response.writeHead(status, { "Content-Type": type });
  response.end(body);
};

const serve = (request, response) => {
  const filePath = safeFilePath(request.url);
  fs.readFile(filePath, (error, content) => {
    if (!error) {
      send(response, 200, content, contentType(filePath));
      return;
    }
    if (error.code === "ENOENT") send(response, 404, "Datei nicht gefunden");
    else send(response, 500, "Serverfehler");
  });
};

http.createServer(serve).listen(port, "127.0.0.1", () => {
  console.log(`Minimalflächen: http://127.0.0.1:${port}/`);
});
