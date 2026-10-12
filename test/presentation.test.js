import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_ROTATION_TURNS,
  PRESENTATION_IDLE_DELAY_MS,
  ROTATION_SPEED,
  createInteractionPause,
  isPresentationInteraction,
  nextPresentationIndices,
  normalizeRotationSpeed
} from "../presentation.js";

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

  it("wertet bloße Mausbewegungen nicht als Interaktion", () => {
    assert.equal(isPresentationInteraction({ type: "pointermove", buttons: 0 }), false);
    assert.equal(isPresentationInteraction({ type: "pointermove", buttons: 1 }), true);
    assert.equal(isPresentationInteraction({ type: "pointerdown", buttons: 1 }), true);
    assert.equal(isPresentationInteraction({ type: "wheel" }), true);
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

  it("pausiert bei Eingaben und setzt nach 10 Sekunden Inaktivität fort", () => {
    const events = [];
    const timers = new Map();
    let nextTimer = 0;
    const pause = createInteractionPause({
      onPause: () => events.push("pause"),
      onResume: () => events.push("resume"),
      setTimer: (callback, delay) => {
        const id = ++nextTimer;
        timers.set(id, { callback, delay });
        return id;
      },
      clearTimer: id => timers.delete(id)
    });

    pause.setPlaying(true);
    pause.noteActivity();
    pause.noteActivity();

    assert.deepEqual(events, ["pause"]);
    assert.equal(timers.size, 1);
    const [{ callback, delay }] = timers.values();
    assert.equal(delay, PRESENTATION_IDLE_DELAY_MS);
    callback();
    assert.deepEqual(events, ["pause", "resume"]);
  });

  it("setzt eine bewusst gestoppte Präsentation nicht wieder fort", () => {
    const events = [];
    let resume;
    const pause = createInteractionPause({
      onPause: () => events.push("pause"),
      onResume: () => events.push("resume"),
      setTimer: callback => { resume = callback; return 1; },
      clearTimer: () => {}
    });

    pause.setPlaying(true);
    pause.noteActivity();
    pause.setPlaying(false);
    resume();

    assert.deepEqual(events, ["pause"]);
  });
});
