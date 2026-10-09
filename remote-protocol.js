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

export const websocketUrl = (relayUrl, room, role, secret) => {
  const url = new URL(`/room/${encodeURIComponent(room)}`, relayUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("role", role);
  url.searchParams.set("secret", secret);
  return url.href;
};
