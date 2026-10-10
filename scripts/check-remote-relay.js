import { REMOTE_RELAY_URL } from "../remote-config.js";
import { randomToken, PUBLIC_REMOTE_SECRET, websocketUrl } from "../remote-protocol.js";

const room = randomToken(6);
const received = new Set();
const commands = [
  { type: "rotate", dx: .1, dy: .1 },
  { type: "object-rotate", yaw: .1, roll: .1 }
];
const display = new WebSocket(websocketUrl(REMOTE_RELAY_URL, room, "display", PUBLIC_REMOTE_SECRET));
let controller;
const finish = code => {
  clearTimeout(timer);
  display.close();
  controller?.close();
  process.exit(code);
};
const timer = setTimeout(() => {
  console.error("Nicht weitergeleitet:", commands.filter(command => !received.has(command.type)));
  finish(1);
}, 8000);
display.addEventListener("open", () => {
  controller = new WebSocket(websocketUrl(REMOTE_RELAY_URL, room, "controller", PUBLIC_REMOTE_SECRET));
  controller.addEventListener("open", () => commands.forEach(command => controller.send(JSON.stringify(command))));
});
display.addEventListener("message", event => {
  const command = JSON.parse(event.data);
  if (!commands.some(expected => expected.type === command.type)) return;
  console.log("Weitergeleitet:", command.type);
  received.add(command.type);
  if (received.size === commands.length) finish(0);
});
