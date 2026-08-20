import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTO_ROTATION_TURNS, ROTATION_SPEED, nextPresentationIndices, normalizeRotationSpeed } from "../presentation.js";

const step = surfaceIndex => nextPresentationIndices({
  surfaceIndex,
  surfaceCount: 4,
  backgroundIndex: 2,
  backgroundCount: 5,
  materialIndex: 3,
  materialCount: 6
});

describe("Präsentationsschleife", () => {
  it("zeigt jede Fläche zwei Umdrehungen lang", () => assert.equal(AUTO_ROTATION_TURNS, 2));

  it("normalisiert die Drehgeschwindigkeit", () => {
    assert.equal(normalizeRotationSpeed(undefined), ROTATION_SPEED.default);
    assert.equal(normalizeRotationSpeed(0), ROTATION_SPEED.default);
    assert.equal(normalizeRotationSpeed(0.1), ROTATION_SPEED.min);
    assert.equal(normalizeRotationSpeed(4), ROTATION_SPEED.max);
    assert.equal(normalizeRotationSpeed(1.5), 1.5);
  });

  it("wechselt zunächst nur zur nächsten Fläche", () => assert.deepEqual(step(1), {
    surfaceIndex: 2,
    backgroundIndex: 2,
    materialIndex: 3,
    themeChanged: false
  }));

  it("wechselt nach der letzten Fläche Hintergrund und Material", () => assert.deepEqual(step(3), {
    surfaceIndex: 0,
    backgroundIndex: 3,
    materialIndex: 4,
    themeChanged: true
  }));

  it("beginnt von einer Zusatzfläche aus bei der ersten Loop-Fläche", () => assert.deepEqual(step(-1), {
    surfaceIndex: 0,
    backgroundIndex: 2,
    materialIndex: 3,
    themeChanged: false
  }));
});
