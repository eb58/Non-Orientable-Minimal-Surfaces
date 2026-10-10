const direction = value => value === -1 || value === 1;
const finiteRange = (value, max) => Number.isFinite(value) && Math.abs(value) <= max;

export const sanitizeRemoteCommand = value => {
  if (!value || typeof value !== "object") return null;
  if (value.type === "object-rotate" && finiteRange(value.yaw, .5) && finiteRange(value.roll, .5))
    return { type: "object-rotate", yaw: value.yaw, roll: value.roll };
  if (value.type === "rotate" && finiteRange(value.dx, .5) && finiteRange(value.dy, .5))
    return { type: "rotate", dx: value.dx, dy: value.dy };
  if (value.type === "zoom" && finiteRange(value.delta, .5))
    return { type: "zoom", delta: value.delta };
  if (["surface", "material", "background"].includes(value.type) && direction(value.direction))
    return { type: value.type, direction: value.direction };
  if (["rotation", "reset"].includes(value.type)) return { type: value.type };
  return null;
};

export const randomToken = (bytes = 16) => {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, value => value.toString(16).padStart(2, "0")).join("");
};

const hexToBase64Url = hex => btoa(String.fromCharCode(...hex.match(/.{2}/g).map(byte => parseInt(byte, 16))))
  .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
const base64UrlToHex = value => Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")))
  .map(character => character.charCodeAt(0).toString(16).padStart(2, "0")).join("");

export const PUBLIC_REMOTE_SECRET = "00000000000000000000000000000000";
export const remoteCredentialsHash = room => hexToBase64Url(room);

export const parseRemoteCredentials = hash => {
  const value = hash.replace(/^#/, "");
  if (/^[A-Za-z0-9_-]{8}$/.test(value))
    return { room: base64UrlToHex(value), secret: PUBLIC_REMOTE_SECRET, relay: null };
  const compact = value.match(/^([A-Za-z0-9_-]{8})\.([A-Za-z0-9_-]{22})$/);
  if (compact) return { room: base64UrlToHex(compact[1]), secret: base64UrlToHex(compact[2]), relay: null };
  const params = new URLSearchParams(value);
  return { room: params.get("room"), secret: params.get("secret"), relay: params.get("relay") };
};

export const websocketUrl = (relayUrl, room, role, secret) => {
  const url = new URL(`/room/${encodeURIComponent(room)}`, relayUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("role", role);
  url.searchParams.set("secret", secret);
  return url.href;
};
