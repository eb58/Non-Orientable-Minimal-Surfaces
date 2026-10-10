import { parseRemoteCredentials, sanitizeRemoteCommand, websocketUrl } from "./remote-protocol.js";
import { REMOTE_RELAY_URL } from "./remote-config.js";

const credentials = parseRemoteCredentials(location.hash);
const room = credentials.room;
const secret = credentials.secret;
const relay = credentials.relay || REMOTE_RELAY_URL;
const status = document.querySelector("#connection-status");
const touchpad = document.querySelector("#touchpad");
const motionToggle = document.querySelector("#motion-toggle");
const motionStatus = document.querySelector("#motion-status");
let socket;
let reconnectTimer;
let lastDistance = null;
let lastPoint = null;
let pendingRotate = { dx: 0, dy: 0 };
let animationFrame = 0;
let pendingObjectRotation = { yaw: 0, roll: 0 };
let objectRotationFrame = 0;
let motionEnabled = false;
let lastOrientation = null;
let filteredMotion = { horizontal: 0, vertical: 0 };
let motionSource = null;
let motionWatchdog = 0;
const HORIZONTAL_MOTION_SENSITIVITY = .04;
const VERTICAL_MOTION_SENSITIVITY = .08;

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
const queueObjectRotation = (yaw, roll) => {
  pendingObjectRotation.yaw = Math.max(-.5, Math.min(.5, pendingObjectRotation.yaw + yaw));
  pendingObjectRotation.roll = Math.max(-.5, Math.min(.5, pendingObjectRotation.roll + roll));
  if (!objectRotationFrame) objectRotationFrame = requestAnimationFrame(() => {
    objectRotationFrame = 0;
    if (pendingObjectRotation.yaw || pendingObjectRotation.roll)
      send({ type: "object-rotate", ...pendingObjectRotation });
    pendingObjectRotation = { yaw: 0, roll: 0 };
  });
};
const angleDelta = (next, previous) => ((next - previous + 540) % 360) - 180;
const screenAngle = () => screen.orientation?.angle ?? window.orientation ?? 0;
const orientedTilt = event => {
  const beta = event.beta;
  const gamma = event.gamma;
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  const angle = ((screenAngle() % 360) + 360) % 360;
  if (angle === 90) return { horizontal: beta, vertical: -gamma };
  if (angle === 270) return { horizontal: -beta, vertical: gamma };
  if (angle === 180) return { horizontal: -gamma, vertical: -beta };
  return { horizontal: gamma, vertical: beta };
};
const handleOrientation = event => {
  if (!motionEnabled) return;
  const next = orientedTilt(event);
  if (!next) return;
  if (motionSource !== "orientation") {
    motionSource = "orientation";
    lastOrientation = null;
    clearTimeout(motionWatchdog);
    motionStatus.textContent = "Aktiv – Neigungssensor empfängt Daten.";
  }
  if (!lastOrientation) { lastOrientation = next; return; }
  const rawHorizontal = angleDelta(next.horizontal, lastOrientation.horizontal);
  const rawVertical = angleDelta(next.vertical, lastOrientation.vertical);
  lastOrientation = next;
  if (Math.abs(rawHorizontal) > 25 || Math.abs(rawVertical) > 25) return;
  filteredMotion.horizontal = filteredMotion.horizontal * .15 + rawHorizontal * .85;
  filteredMotion.vertical = filteredMotion.vertical * .15 + rawVertical * .85;
  const horizontal = Math.abs(filteredMotion.horizontal) < .03 ? 0 : filteredMotion.horizontal;
  const vertical = Math.abs(filteredMotion.vertical) < .03 ? 0 : filteredMotion.vertical;
  if (horizontal || vertical) queueObjectRotation(
    horizontal * HORIZONTAL_MOTION_SENSITIVITY,
    vertical * VERTICAL_MOTION_SENSITIVITY
  );
};
const handleDeviceMotion = event => {
  if (!motionEnabled || motionSource === "orientation" || !event.rotationRate) return;
  // rotationRate uses alpha=X and beta=Y, unlike orientation's beta=X,
  // gamma=Y. Its gamma measures twisting around the screen normal.
  const alpha = event.rotationRate.alpha;
  const beta = event.rotationRate.beta;
  if (!Number.isFinite(alpha) || !Number.isFinite(beta)) return;
  if (motionSource !== "gyroscope") {
    motionSource = "gyroscope";
    lastOrientation = null;
    clearTimeout(motionWatchdog);
    motionStatus.textContent = "Aktiv – Gyroskop empfängt Daten.";
  }
  const seconds = Math.max(.005, Math.min(.1, Number(event.interval || 16) / 1000));
  const angle = ((screenAngle() % 360) + 360) % 360;
  let horizontal = beta;
  let vertical = alpha;
  if (angle === 90) [horizontal, vertical] = [alpha, -beta];
  else if (angle === 270) [horizontal, vertical] = [-alpha, beta];
  else if (angle === 180) [horizontal, vertical] = [-beta, -alpha];
  const dx = Math.abs(horizontal) < .2 ? 0 : horizontal * seconds * HORIZONTAL_MOTION_SENSITIVITY;
  const dy = Math.abs(vertical) < .2 ? 0 : vertical * seconds * VERTICAL_MOTION_SENSITIVITY;
  if (dx || dy) queueObjectRotation(dx, dy);
};

const setMotionEnabled = enabled => {
  motionEnabled = enabled;
  lastOrientation = null;
  filteredMotion = { horizontal: 0, vertical: 0 };
  motionSource = null;
  clearTimeout(motionWatchdog);
  motionToggle.setAttribute("aria-pressed", String(enabled));
  motionToggle.textContent = enabled ? "Bewegung ausschalten" : "Sensorsteuerung einschalten";
  motionStatus.textContent = enabled
    ? "Aktiv – Smartphone neigen; erneutes Aktivieren kalibriert neu."
    : "Smartphone neigen, um die Fläche zu drehen.";
};
const toggleMotion = async () => {
  if (motionEnabled) { setMotionEnabled(false); return; }
  if (!isSecureContext) {
    motionStatus.textContent = "Sensoren benötigen eine sichere HTTPS-Verbindung.";
    return;
  }
  if (!("DeviceOrientationEvent" in window) && !("DeviceMotionEvent" in window)) {
    motionStatus.textContent = "Dieser Browser stellt keine Bewegungssensoren bereit.";
    return;
  }
  try {
    const permissionRequests = [];
    if (typeof window.DeviceOrientationEvent?.requestPermission === "function")
      permissionRequests.push(window.DeviceOrientationEvent.requestPermission());
    if (typeof window.DeviceMotionEvent?.requestPermission === "function")
      permissionRequests.push(window.DeviceMotionEvent.requestPermission());
    const permissions = await Promise.all(permissionRequests);
    if (permissions.length && permissions.every(permission => permission !== "granted"))
      throw new Error("permission-denied");
    setMotionEnabled(true);
    motionStatus.textContent = "Aktivierung erfolgreich – Smartphone jetzt bewegen …";
    motionWatchdog = setTimeout(() => {
      if (motionEnabled && !motionSource)
        motionStatus.textContent = "Keine Sensordaten. Sensorzugriff in den Website-Einstellungen erlauben und Seite neu laden.";
    }, 1800);
  } catch {
    setMotionEnabled(false);
    motionStatus.textContent = "Sensorzugriff wurde nicht erlaubt. Bitte in den Browser-Einstellungen freigeben.";
  }
};

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
window.addEventListener("deviceorientation", handleOrientation);
window.addEventListener("devicemotion", handleDeviceMotion);
motionToggle.addEventListener("click", toggleMotion);
connect();
