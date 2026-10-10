import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parseRemoteCredentials, sanitizeRemoteCommand, websocketUrl } from "../remote-protocol.js";

const remoteSource = readFileSync(new URL("../remote.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "");

// Execute the controller's real event handlers and inspect commands sent over
// its socket, without depending on phone hardware or a running relay.
const controller = async (angle = 0) => {
  const listeners = new Map();
  const frames = new Map();
  const messages = [];
  let nextFrame = 0;
  const element = () => ({
    textContent: "",
    listeners: new Map(),
    addEventListener(type, handler) { this.listeners.set(type, handler); },
    setAttribute() {}
  });
  const elements = new Map(["#connection-status", "#touchpad", "#motion-toggle", "#motion-status"]
    .map(selector => [selector, element()]));
  class Socket {
    static OPEN = 1;
    readyState = Socket.OPEN;
    addEventListener() {}
    send(message) { messages.push(JSON.parse(message)); }
  }
  runInNewContext(remoteSource, {
    parseRemoteCredentials, sanitizeRemoteCommand, websocketUrl,
    REMOTE_RELAY_URL: "https://relay.example",
    location: { hash: "#room=test&secret=test" },
    isSecureContext: true,
    document: {
      querySelector: selector => elements.get(selector),
      querySelectorAll: () => [],
      body: { classList: { add() {}, remove() {} } }
    },
    window: {
      DeviceMotionEvent: class {},
      DeviceOrientationEvent: class {},
      addEventListener: (type, handler) => listeners.set(type, handler)
    },
    screen: { orientation: { angle } },
    WebSocket: Socket,
    requestAnimationFrame: handler => { frames.set(++nextFrame, handler); return nextFrame; },
    setTimeout: () => 1,
    clearTimeout() {}
  });
  const toggle = () => elements.get("#motion-toggle").listeners.get("click")();
  await toggle();
  return {
    emit(type, event) {
      listeners.get(type)(event);
      for (const [id, handler] of frames) {
        frames.delete(id);
        handler();
      }
    },
    toggle,
    messages,
    status: () => elements.get("#motion-status").textContent
  };
};

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10,
  `expected ${expected}, received ${actual}`);
const expectRotation = (remote, yaw, roll) => {
  assert.equal(remote.messages.length, 1);
  const command = remote.messages[0];
  assert.equal(command.type, "object-rotate");
  closeTo(command.yaw, yaw);
  closeTo(command.roll, roll);
};

const screenMappings = [
  { angle: 0, x: [0, 1], y: [1, 0] },
  { angle: 90, x: [1, 0], y: [0, -1] },
  { angle: 180, x: [0, -1], y: [-1, 0] },
  { angle: 270, x: [-1, 0], y: [0, 1] }
];

for (const { angle, x, y } of screenMappings) {
  test(`orientation maps both physical tilt axes to screen axes at ${angle} degrees`, async () => {
    for (const [axis, [yaw, roll]] of [["beta", x], ["gamma", y]]) {
      const remote = await controller(angle);
      remote.emit("deviceorientation", { alpha: 10, beta: 60, gamma: 0 });
      remote.emit("deviceorientation", { alpha: 10, beta: 60, gamma: 0, [axis]: axis === "beta" ? 61 : 1 });
      expectRotation(remote, yaw * .85 * .04, roll * .85 * .08);
    }
  });

  test(`gyroscope maps alpha=X and beta=Y to screen axes at ${angle} degrees`, async () => {
    for (const [axis, [yaw, roll]] of [["alpha", x], ["beta", y]]) {
      const remote = await controller(angle);
      remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: 0, beta: 0, gamma: 0, [axis]: 100 } });
      expectRotation(remote, yaw * 2 * .04, roll * 2 * .08);
    }
  });
}

test("orientation takes precedence over gyroscope without applying both streams", async () => {
  const remote = await controller();
  remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: 100, beta: 0, gamma: 0 } });
  remote.messages.length = 0;
  remote.emit("deviceorientation", { beta: 60, gamma: 0 });
  remote.emit("deviceorientation", { beta: 60, gamma: 1 });
  remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: 100, beta: 100, gamma: 0 } });
  expectRotation(remote, .85 * .04, 0);
  assert.match(remote.status(), /Neigungssensor/);
});

test("unavailable orientation values do not disable valid gyro fallback", async () => {
  for (const orientation of [{ beta: null, gamma: null }, { beta: 60, gamma: null }, { beta: null, gamma: 0 }]) {
    const remote = await controller();
    remote.emit("deviceorientation", orientation);
    remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: 100, beta: 0, gamma: null } });
    expectRotation(remote, 0, .16);
    assert.match(remote.status(), /Gyroskop/);
  }
});

test("missing gyro axes are not treated as zero and gamma twist is ignored", async () => {
  const remote = await controller();
  remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: null, beta: 100, gamma: 0 } });
  remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: 100, beta: null, gamma: 0 } });
  remote.emit("devicemotion", { interval: 20, rotationRate: { alpha: 0, beta: 0, gamma: 100 } });
  assert.deepEqual(remote.messages, []);
});

test("reactivating sensor controls establishes a fresh orientation baseline", async () => {
  const remote = await controller();
  remote.emit("deviceorientation", { beta: 60, gamma: 0 });
  await remote.toggle();
  remote.emit("deviceorientation", { beta: 70, gamma: 10 });
  assert.deepEqual(remote.messages, []);
  await remote.toggle();
  remote.emit("deviceorientation", { beta: 70, gamma: 10 });
  assert.deepEqual(remote.messages, []);
  remote.emit("deviceorientation", { beta: 71, gamma: 10 });
  expectRotation(remote, 0, .85 * .08);
});
