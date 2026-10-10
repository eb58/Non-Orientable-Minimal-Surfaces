import test from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_REMOTE_SECRET, parseRemoteCredentials, remoteCredentialsHash, sanitizeRemoteCommand, websocketUrl
} from "../remote-protocol.js";

test("accepts known bounded commands", () => {
  assert.deepEqual(sanitizeRemoteCommand({ type: "rotate", dx: .2, dy: -.1, ignored: true }), { type: "rotate", dx: .2, dy: -.1 });
  assert.deepEqual(sanitizeRemoteCommand({ type: "surface", direction: -1 }), { type: "surface", direction: -1 });
  assert.deepEqual(sanitizeRemoteCommand({ type: "reset" }), { type: "reset" });
});

test("rejects malformed and excessive commands", () => {
  assert.deepEqual(sanitizeRemoteCommand({ type: "object-rotate", yaw: .2, roll: -.3 }), { type: "object-rotate", yaw: .2, roll: -.3 });
  assert.deepEqual(sanitizeRemoteCommand({ type: "object-translate", horizontal: .28, vertical: 0 }), { type: "object-translate", horizontal: .28, vertical: 0 });
  assert.equal(sanitizeRemoteCommand({ type: "object-rotate", yaw: .2, roll: Infinity }), null);
  assert.equal(sanitizeRemoteCommand({ type: "object-rotate", yaw: 1, roll: 0 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "object-translate", horizontal: 1, vertical: 0 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "rotate", dx: 9, dy: 0 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "surface", direction: 2 }), null);
  assert.equal(sanitizeRemoteCommand({ type: "unknown" }), null);
});

test("builds a secure websocket URL", () => {
  assert.equal(websocketUrl("https://relay.example", "abc", "display", "secret"), "wss://relay.example/room/abc?role=display&secret=secret");
});

test("encodes a remote room into a compact hash", () => {
  const room = "001122334455";
  const hash = remoteCredentialsHash(room);
  assert.equal(hash.length, 8);
  assert.deepEqual(parseRemoteCredentials(`#${hash}`), { room, secret: PUBLIC_REMOTE_SECRET, relay: null });
});

test("keeps accepting legacy remote links", () => {
  assert.deepEqual(parseRemoteCredentials("#room=abc&secret=def&relay=https%3A%2F%2Frelay.example"), {
    room: "abc", secret: "def", relay: "https://relay.example"
  });
});
