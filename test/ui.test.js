import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { directionalSliderValue, nearestRangeEndpoint, sliderValueAtRatio } from "../ui.js";

const slider = (min, max, step) => ({ min, max, step });

describe("sliderValueAtRatio", () => {
  it("bildet die Skalenraender auf Minimum und Maximum ab", () => {
    const control = slider(3, 17, 2);
    assert.equal(sliderValueAtRatio(control, 0), 3);
    assert.equal(sliderValueAtRatio(control, 1), 17);
  });

  it("kappt Klickpositionen ausserhalb der Skala", () => {
    const control = slider(0, 10, 1);
    assert.equal(sliderValueAtRatio(control, -0.5), 0);
    assert.equal(sliderValueAtRatio(control, 1.5), 10);
  });

  it("rundet Kusner-p auf die erlaubten ungeraden Schritte", () => {
    const control = slider(3, 17, 2);
    assert.equal(sliderValueAtRatio(control, 0.5), 11);
    assert.equal(sliderValueAtRatio(control, 0.72), 13);
  });

  it("rundet Dezimalschritte relativ zum Minimum", () => {
    const value = sliderValueAtRatio(slider(0.3, 3, 0.05), 0.5);
    assert.ok(Math.abs(value - 1.65) < 1e-12);
  });
});

describe("nearestRangeEndpoint", () => {
  it("waehlt links das Minimum und rechts das Maximum", () => {
    assert.equal(nearestRangeEndpoint(2, 1, 8), "min");
    assert.equal(nearestRangeEndpoint(7, 1, 8), "max");
  });

  it("waehlt bei gleichem Abstand stabil das Minimum", () =>
    assert.equal(nearestRangeEndpoint(5, 2, 8), "min")
  );
});

describe("directionalSliderValue", () => {
  const control = slider(3, 17, 2);

  it("erhoeht p bei jedem Klick rechts vom aktuellen Wert mindestens einmal", () => {
    assert.equal(directionalSliderValue(control, 0.51, 9), 11);
    assert.ok(directionalSliderValue(control, 0.9, 9) > 9);
    assert.equal(directionalSliderValue(control, 1, 9), 17);
  });

  it("verringert p bei jedem Klick links vom aktuellen Wert mindestens einmal", () => {
    assert.equal(directionalSliderValue(control, 0.49, 11), 9);
    assert.equal(directionalSliderValue(control, 0.05, 11), 3);
  });

  it("bleibt an den aeusseren Grenzen innerhalb des erlaubten Bereichs", () => {
    assert.equal(directionalSliderValue(control, 1, 17), 17);
    assert.equal(directionalSliderValue(control, 0, 3), 3);
  });
});
