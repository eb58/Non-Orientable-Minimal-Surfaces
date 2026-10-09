import { sanitizeRemoteCommand, websocketUrl } from "./remote-protocol.js";

const params = new URLSearchParams(location.hash.slice(1));
const room = params.get("room");
const secret = params.get("secret");
const relay = params.get("relay");
const status = document.querySelector("#connection-status");
const touchpad = document.querySelector("#touchpad");
let socket;
let reconnectTimer;
let lastDistance = null;
let lastPoint = null;
let pendingRotate = { dx: 0, dy: 0 };
let animationFrame = 0;

const setStatus = (text, className = "") => {
  status.textContent = text;
  document.body.classList.remove("connected", "disconnected");
  if (className) document.body.classList.add(className);
};
const send = command => {
  const clean = sanitizeRemoteCommand(command);
  if (clean && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(clean));
};
const flushRotate = () => {
  animationFrame = 0;
  if (pendingRotate.dx || pendingRotate.dy) send({ type: "rotate", ...pendingRotate });
  pendingRotate = { dx: 0, dy: 0 };
};
const queueRotate = (dx, dy) => {
  pendingRotate.dx = Math.max(-.5, Math.min(.5, pendingRotate.dx + dx));
  pendingRotate.dy = Math.max(-.5, Math.min(.5, pendingRotate.dy + dy));
  if (!animationFrame) animationFrame = requestAnimationFrame(flushRotate);
};
const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

const connect = () => {
  clearTimeout(reconnectTimer);
  if (!room || !secret || !relay) { setStatus("Ungültiger QR-Code", "disconnected"); return; }
  setStatus("Verbindung wird aufgebaut …");
  socket = new WebSocket(websocketUrl(relay, room, "controller", secret));
  socket.addEventListener("open", () => setStatus("Mit dem Fernseher verbunden", "connected"));
  socket.addEventListener("close", () => {
    setStatus("Verbindung unterbrochen – neuer Versuch …", "disconnected");
    reconnectTimer = setTimeout(connect, 1500);
  });
  socket.addEventListener("error", () => socket.close());
};

touchpad.addEventListener("touchstart", event => {
  if (event.touches.length === 2) lastDistance = distance(event.touches);
  else if (event.touches.length === 1) lastPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
touchpad.addEventListener("touchmove", event => {
  event.preventDefault();
  if (event.touches.length === 2) {
    const next = distance(event.touches);
    if (lastDistance !== null) send({ type: "zoom", delta: Math.max(-.5, Math.min(.5, (lastDistance - next) * .006)) });
    lastDistance = next;
  } else if (event.touches.length === 1 && lastPoint) {
    const point = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    queueRotate((point.x - lastPoint.x) * .006, (point.y - lastPoint.y) * .006);
    lastPoint = point;
  }
}, { passive: false });
touchpad.addEventListener("touchend", () => { lastPoint = null; lastDistance = null; });
touchpad.addEventListener("pointerdown", event => {
  if (event.pointerType === "touch") return;
  touchpad.setPointerCapture(event.pointerId);
  lastPoint = { x: event.clientX, y: event.clientY };
});
touchpad.addEventListener("pointermove", event => {
  if (!lastPoint || event.pointerType === "touch") return;
  queueRotate((event.clientX - lastPoint.x) * .006, (event.clientY - lastPoint.y) * .006);
  lastPoint = { x: event.clientX, y: event.clientY };
});
touchpad.addEventListener("pointerup", () => { lastPoint = null; });
touchpad.addEventListener("wheel", event => { event.preventDefault(); send({ type: "zoom", delta: Math.sign(event.deltaY) * .12 }); }, { passive: false });

document.querySelectorAll("[data-command]").forEach(button => button.addEventListener("click", () => {
  const command = { type: button.dataset.command };
  if (button.dataset.direction) command.direction = Number(button.dataset.direction);
  send(command);
}));
connect();
