import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { directionalSliderValue, isTvUserAgent, nearestRangeEndpoint, sliderValueAtRatio } from "../ui.js";

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

describe("isTvUserAgent", () => {
  it("erkennt verbreitete TV-Plattformen", () => {
    [
      "Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7292) Silk/112.1",
      "Mozilla/5.0 (Linux; Android 10; BRAVIA 4K GB Build/QTG3)",
      "Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0)",
      "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.41",
      "HbbTV/1.6.1 (+DRM;Samsung;SmartTV2022)",
      "Mozilla/5.0 (Linux; U; Android 11; MiTV Build/RTT0)",
      "Roku/DVP-12.5"
    ].forEach(userAgent => assert.equal(isTvUserAgent(userAgent), true, userAgent));
  });

  it("laesst Computer, Smartphones und Tablets im normalen Modus", () => {
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15",
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari/537.36",
      "Mozilla/5.0 (Linux; Android 13; KFTRWI Build/TP1A) Silk/112.1",
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile/15E148"
    ].forEach(userAgent => assert.equal(isTvUserAgent(userAgent), false, userAgent));
  });
});
