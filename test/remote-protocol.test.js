import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRemoteCommand, websocketUrl } from "../remote-protocol.js";

test("accepts known bounded commands", () => {
  assert.deepEqual(sanitizeRemoteCommand({ type: "rotate", dx: .2, dy: -.1, ignored: true }), { type: "rotate", dx: .2, dy: -.1 });
  assert.deepEqual(sanitizeRemoteCommand({ type: "surface", direction: -1 }), { type: "surface", direction: -1 });
  assert.deepEqual(sanitizeRemoteCommand({ type: "reset" }), { type: "reset" });
});

test("rejects malformed and excessive commands", () => {
  assert.deepEqual(sanitizeRemoteCommand({ type: "object-rotate", yaw: .2, roll: -.3 }), { type: "object-rotate", yaw: .2, roll: -.3 });
  assert.equal(sanitizeRemoteCommand({ type: "object-rotate", yaw: .2, roll: Infinity }), null);
  assert.equal(sanitizeRemoteCommand({ type: "object-rotate", yaw: 1, roll: 0 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "rotate", dx: 9, dy: 0 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "surface", direction: 2 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "unknown" }), null);
});

test("builds a secure websocket URL", () => {
  assert.equal(websocketUrl("https://relay.example", "abc", "display", "secret"), "wss://relay.example/room/abc?role=display&secret=secret");
});
