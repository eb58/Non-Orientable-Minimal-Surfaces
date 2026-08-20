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
  it("enthaelt S42", () => assert.ok(findSurface("S42")));
  it("ordnet die nicht zyklischen Flaechen am Ende des Katalogs an", () => {
    const names = surfaces.map(surface => surface.name.trim());
    assert.deepEqual(names.slice(-6), [
      "Grad-7-Familie",
      "S41_5_1 UFO",
      "S42",
      "Katenoid-Helikoid",
      "Lopez Klein Bottle",
      "Enneper"
    ]);
    assert.ok(surfaces.slice(-6).every(surface => surface.cycle === false));
    assert.ok(surfaces.slice(0, -6).every(surface => surface.cycle !== false));
    assert.notEqual(findSurface("Costa").cycle, false);
  });
  it("verwendet fuer S42 den geeigneten Ausschnitt und die passende Aufloesung", () => {
    const s42 = findSurface("S42");
    assert.deepEqual(s42.uRange, [1.8, 3]);
    assert.equal(s42.uSegments, 58);
    assert.equal(s42.vSegments, 301);
  });
  it("verwendet fuer Costa den punktierten quadratischen Torus", () => {
    const costa = findSurface("Costa");
    assert.deepEqual(costa.uRange, [0, 1]);
    assert.deepEqual(costa.vRange, [0, 1]);
    assert.equal(costa.parameters.cutoff.value, 0.12);
    assert.equal(costa.fixedDomain, true);
    assert.equal(costa.uSegments, 160);
    assert.equal(costa.vSegments, 160);
    const mesh = costa.mesh(costa);
    assert.ok(mesh.points.length < costa.uSegments * costa.vSegments);
    assert.equal(mesh.indices.length % 3, 0);
    assert.ok(mesh.indices.every(index => index >= 0 && index < mesh.points.length));
    assert.ok(mesh.lineIndices.flat().every(index => index >= 0 && index < mesh.points.length));
    const faces = Array.from({ length: mesh.indices.length / 3 }, (_, index) => mesh.indices.slice(3 * index, 3 * index + 3));
    const edgeCounts = faces.flatMap(([a, b, c]) => [[a, b], [b, c], [c, a]]).reduce((counts, [a, b]) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map());
    const boundaryEdges = [...edgeCounts].filter(([, count]) => count === 1).map(([key]) => key.split(",").map(Number));
    const adjacency = boundaryEdges.reduce((neighbors, [a, b]) => {
      neighbors.set(a, [...(neighbors.get(a) || []), b]);
      neighbors.set(b, [...(neighbors.get(b) || []), a]);
      return neighbors;
    }, new Map());
    const visited = new Set();
    const visit = vertex => {
      if (visited.has(vertex)) return;
      visited.add(vertex);
      adjacency.get(vertex).forEach(visit);
    };
    const boundaryComponents = [...adjacency.keys()].reduce((count, vertex) => {
      if (visited.has(vertex)) return count;
      visit(vertex);
      return count + 1;
    }, 0);
    assert.equal(mesh.points.length - edgeCounts.size + faces.length, -3);
    assert.equal(boundaryComponents, 3);
    assert.ok([...adjacency.values()].every(neighbors => neighbors.length === 2));
  });
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
  it("verarbeitet grosse Punktwolken ohne die Argumentgrenze zu ueberschreiten", () => {
    const pointGrids = [[Array.from({ length: 150_000 }, (_, index) => [index % 101, index % 53, index % 29])]];
    const [normalized] = normalizePointGrids(pointGrids);
    assert.equal(normalized[0].length, 150_000);
    assert.ok(normalized[0].flat().every(Number.isFinite));
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
    assert.equal(rebuilt.vSegments, 641);
    assert.equal(typeof rebuilt.f, "function");
  });
  it("Cobra-Familie: normalisiert m und t und baut die Formeln neu auf", () => {
    const surface = findSurface("Cobra-Familie");
    assert.deepEqual(surface.normalizeParameters({ m: 6, t: 10 }), { m: 7, t: 3 });
    assert.deepEqual(surface.normalizeParameters({ t: 1.8 }), { m: 5, t: 1.8 });
    const rebuilt = surface.withParameters({ m: 7, t: 1 });
    assert.equal(rebuilt.parameters.m.value, 7);
    assert.equal(rebuilt.parameters.t.value, 1);
    assert.match(rebuilt.fText, /z\^8$/);
    assert.match(rebuilt.gText, /^z => z\^5 /);
    assert.equal(rebuilt.vSegments, 221);
    assert.ok(allPoints(pointGridsFor(rebuilt)).every(isFiniteVector));
  });
  it("Cobra-Familie: t = 1 stimmt exakt mit Cobra ueberein", () => {
    const cobra = findSurface("Cobra");
    const family = findSurface("Cobra-Familie");
    const z = { re: 1.17, im: 0.31 };
    assert.deepEqual(family.uRange, cobra.uRange);
    assert.deepEqual(family.vRange, cobra.vRange);
    assert.equal(family.uSegments, cobra.uSegments);
    assert.equal(family.vSegments, cobra.vSegments);
    assert.equal(family.parameters.m.value, cobra.parameters.m.value);
    assert.equal(family.parameters.t.value, 1);
    assert.deepEqual(family.f(z), cobra.f(z));
    assert.deepEqual(family.g(z), cobra.g(z));
    assert.deepEqual(pointGridsFor(family), pointGridsFor(cobra));
  });
  it("Grad-7-Familie: normalisiert den komplexen Parameter und erzeugt endliche Punkte", () => {
    const surface = findSurface("Grad-7-Familie");
    assert.deepEqual(surface.normalizeParameters({ cr: -4, ci: 4 }), { cr: -2.5, ci: 2.5 });
    const rebuilt = surface.withParameters({ cr: 0.9, ci: -0.4 });
    assert.equal(rebuilt.parameters.cr.value, 0.9);
    assert.equal(rebuilt.parameters.ci.value, -0.4);
    assert.ok(allPoints(pointGridsFor(rebuilt)).every(isFiniteVector));
  });
  it("S41: normalizeParameters erzwingt n < m, beide ungerade", () => {
    const s41 = findSurface("S41_3_1 - Meeks Möbiusband (Twisted Catenoid)");
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
  it("Henneberg: normalizeParameters rundet und kappt m auf [1, 9]", () => {
    const surface = findSurface("Henneberg");
    assert.equal(surface.parameters.m.value, 5);
    assert.deepEqual(surface.uRange, [1.8, 2]);
    assert.deepEqual(surface.normalizeParameters({ m: 4.7 }), { m: 5 });
    assert.deepEqual(surface.normalizeParameters({ m: 20 }), { m: 9 });
  });
  it("Henneberg: withParameters passt Formel und Aufloesung an", () => {
    const surface = findSurface("Henneberg").withParameters({ m: 5 });
    assert.equal(surface.parameters.m.value, 5);
    assert.equal(surface.fText, "z => 1 * (z^12 - 1) / z^8");
    assert.deepEqual(surface.uRange, [1.8, 2]);
    assert.equal(surface.vSegments, 361);
  });
  it("Henneberg: verwendet fuer alle Restklassen den richtigen Phasenfaktor", () => {
    const surface = findSurface("Henneberg");
    const formulas = [1, 2, 3, 4].map(m => surface.withParameters({ m }).fText);
    assert.deepEqual(formulas, [
      "z => 1 * (z^4 - 1) / z^4",
      "z => i * (z^6 - 1) / z^5",
      "z => -1 * (z^8 - 1) / z^6",
      "z => -i * (z^10 - 1) / z^7"
    ]);
  });
});
