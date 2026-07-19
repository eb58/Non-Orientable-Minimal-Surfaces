import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TAU, clamp, surfaces, pointGridsFor, normalizePointGrids } from "../math.js";

const findSurface = name => surfaces.find(surface => surface.name.trim() === name);
const isFiniteVector = point => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
const allPoints = pointGrids => pointGrids.flat(2);

describe("clamp", () => {
  it("laesst Werte innerhalb der Grenzen unveraendert", () => assert.equal(clamp(0, 5, 10), 5));
  it("kappt Werte unterhalb des Minimums", () => assert.equal(clamp(0, -5, 10), 0));
  it("kappt Werte oberhalb des Maximums", () => assert.equal(clamp(0, 15, 10), 10));
});

describe("TAU", () => {
  it("ist 2*PI", () => assert.equal(TAU, Math.PI * 2));
});

describe("surfaces-Katalog", () => {
  it("enthaelt mindestens eine Flaeche", () => assert.ok(surfaces.length > 0));
  it("hat eindeutige Namen", () => {
    const names = surfaces.map(surface => surface.name);
    assert.equal(new Set(names).size, names.length);
  });
  it("liefert fuer jede Flaeche ein vollstaendiges Preset", () =>
    surfaces.forEach(surface => {
      assert.equal(surface.uRange.length, 2);
      assert.equal(surface.vRange.length, 2);
      assert.ok(surface.uSegments > 0);
      assert.ok(surface.vSegments > 0);
      assert.equal(typeof surface.fText, "string");
      assert.equal(typeof surface.gText, "string");
      assert.equal(typeof surface.f, "function");
      assert.equal(typeof surface.g, "function");
    })
  );
});

describe("pointGridsFor", () => {
  surfaces.forEach(surface => {
    it(`erzeugt endliche Punkte fuer "${surface.name.trim()}"`, () => {
      const pointGrids = pointGridsFor(surface);
      const points = allPoints(pointGrids);
      assert.ok(points.length > 0);
      assert.ok(points.every(isFiniteVector));
    });
  });
});

describe("normalizePointGrids", () => {
  it("zentriert die Punktwolke und skaliert auf Radius 1", () => {
    const pointGrids = [[[[0, 0, 0], [2, 0, 0]], [[0, 2, 0], [0, 0, 2]]]];
    const [normalized] = normalizePointGrids(pointGrids);
    const points = normalized.flat();
    const midpoint = [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
    midpoint.forEach(component => assert.ok(Math.abs(component) < 1e-9));
    const maxRadius = Math.max(...points.map(point => Math.hypot(...point)));
    assert.ok(Math.abs(maxRadius - 1) < 1e-9);
  });
  it("faengt nicht-endliche Punkte als Ursprung ab", () => {
    const pointGrids = [[[[0, 0, 0], [Infinity, 0, 0], [1, 0, 0]]]];
    const [normalized] = normalizePointGrids(pointGrids);
    assert.deepEqual(normalized[0][1], [0, 0, 0]);
  });
});

describe("parametrisierte Flaechen", () => {
  it("Kusner: normalizeParameters erzwingt ungerades p im Bereich", () => {
    const kusner = findSurface("Kusner");
    // oddInRange rundet und setzt per Bitmaske |1 das letzte Bit, gerade Werte springen also aufwaerts
    assert.deepEqual(kusner.normalizeParameters({ p: 4 }), { p: 5 });
    assert.deepEqual(kusner.normalizeParameters({ p: 100 }), { p: 17 });
  });
  it("Kusner: withParameters baut die Flaeche mit neuem p neu auf", () => {
    const kusner = findSurface("Kusner");
    const rebuilt = kusner.withParameters({ p: 7 });
    assert.equal(rebuilt.parameters.p.value, 7);
    assert.equal(typeof rebuilt.f, "function");
  });
  it("S41: normalizeParameters erzwingt n < m, beide ungerade", () => {
    const s41 = findSurface("S41_3_1 Twisted Catenoid");
    assert.deepEqual(s41.normalizeParameters({ m: 4, n: 4 }), { m: 5, n: 3 });
  });
  it("Katenoid-Helikoid: normalizeParameters kappt den Winkel auf [0, 90]", () => {
    const surface = findSurface("Katenoid-Helikoid");
    assert.deepEqual(surface.normalizeParameters({ angle: -10 }), { angle: 0 });
    assert.deepEqual(surface.normalizeParameters({ angle: 150 }), { angle: 90 });
  });
  it("Richmond: normalizeParameters rundet und kappt n auf [1, 6]", () => {
    const surface = findSurface("Richmond");
    assert.deepEqual(surface.normalizeParameters({ n: 6.7 }), { n: 6 });
    assert.deepEqual(surface.normalizeParameters({ n: 0 }), { n: 1 });
  });
});
