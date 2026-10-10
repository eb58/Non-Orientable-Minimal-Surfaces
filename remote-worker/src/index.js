const allowedRoles = new Set(["display", "controller"]);

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([a-f0-9]{12})$/);
    if (!match) return new Response("Not found", { status: 404 });
    return env.ROOMS.getByName(match[1]).fetch(request);
  }
};

export class Room {
  constructor(ctx) { this.ctx = ctx; }

  fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket required", { status: 426 });
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const secret = url.searchParams.get("secret");
    if (!allowedRoles.has(role) || !/^[a-f0-9]{32}$/.test(secret || "")) return new Response("Forbidden", { status: 403 });

    const sockets = this.ctx.getWebSockets();
    const existingSecret = sockets[0]?.deserializeAttachment()?.secret;
    if (existingSecret && existingSecret !== secret) return new Response("Forbidden", { status: 403 });
    for (const socket of sockets) {
      if (socket.deserializeAttachment()?.role === role) socket.close(4001, "Replaced by a new connection");
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role, secret });
    this.broadcast({ type: "peer-connected", role }, server);
    const peerRole = role === "display" ? "controller" : "display";
    if (this.ctx.getWebSockets().some(socket => socket !== server && socket.deserializeAttachment()?.role === peerRole)) {
      server.send(JSON.stringify({ type: "peer-connected", role: peerRole }));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, message) {
    const sender = socket.deserializeAttachment();
    if (sender?.role !== "controller" || typeof message !== "string" || message.length > 256) return;
    let value;
    try { value = JSON.parse(message); } catch { return; }
    if (!this.validCommand(value)) return;
    for (const peer of this.ctx.getWebSockets()) {
      if (peer.deserializeAttachment()?.role === "display") peer.send(JSON.stringify(value));
    }
  }

  webSocketClose(socket) {
    const role = socket.deserializeAttachment()?.role;
    if (this.ctx.getWebSockets().some(peer => peer !== socket && peer.deserializeAttachment()?.role === role)) return;
    this.broadcast({ type: "peer-disconnected", role }, socket);
  }

  webSocketError(socket) { socket.close(1011, "WebSocket error"); }

  broadcast(value, except) {
    const message = JSON.stringify(value);
    for (const socket of this.ctx.getWebSockets()) if (socket !== except) socket.send(message);
  }

  validCommand(value) {
    if (!value || typeof value !== "object") return false;
    if (value.type === "object-rotate") return Number.isFinite(value.yaw) && Math.abs(value.yaw) <= .5 && Number.isFinite(value.roll) && Math.abs(value.roll) <= .5;
    if (value.type === "object-translate") return Number.isFinite(value.horizontal) && Math.abs(value.horizontal) <= .5 && Number.isFinite(value.vertical) && Math.abs(value.vertical) <= .5;
    if (value.type === "rotate") return Number.isFinite(value.dx) && Math.abs(value.dx) <= .5 && Number.isFinite(value.dy) && Math.abs(value.dy) <= .5;
    if (value.type === "zoom") return Number.isFinite(value.delta) && Math.abs(value.delta) <= .5;
    if (["surface", "material", "background"].includes(value.type)) return value.direction === -1 || value.direction === 1;
    return value.type === "rotation" || value.type === "reset";
  }
}
