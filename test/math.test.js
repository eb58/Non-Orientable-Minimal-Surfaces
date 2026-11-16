import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TAU, clamp, surfaces, pointGridsFor, normalizePointGrids } from "../math.js";
import { C$ } from "../complex.js";

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
      assert.ok(surface.uRange.every(Number.isFinite));
      assert.ok(surface.vRange.every(Number.isFinite));
      assert.ok(surface.uRange[0] < surface.uRange[1]);
      assert.ok(surface.vRange[0] < surface.vRange[1]);
      assert.ok(Number.isInteger(surface.uSegments) && surface.uSegments > 0);
      assert.ok(Number.isInteger(surface.vSegments) && surface.vSegments > 0);
      assert.equal(typeof surface.fText, "string");
      assert.equal(typeof surface.gText, "string");
      assert.equal(typeof surface.f, "function");
      assert.equal(typeof surface.g, "function");
    })
  );
  it("hat gueltige Standardwerte fuer alle Flaechenparameter", () =>
    surfaces.forEach(surface => Object.values(surface.parameters || {}).forEach(parameter => {
      assert.ok(Number.isFinite(parameter.value));
      assert.ok(parameter.value >= parameter.min);
      assert.ok(parameter.value <= parameter.max);
      const steps = (parameter.value - parameter.min) / parameter.step;
      assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9);
    }))
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
    assert.equal(rebuilt.uSegments, 111);
    assert.equal(rebuilt.vSegments, 697);
    assert.equal(rebuilt.uRange[0], 1);
    assert.equal(rebuilt.uRange[1], 1.028);
    assert.equal(rebuilt.uBounds[1], 1.06);
    assert.ok(rebuilt.uBounds[0] < rebuilt.uRange[0]);
    assert.ok(rebuilt.uRange[1] <= rebuilt.uBounds[1]);
    assert.equal(rebuilt.uStep, 0.001);
    assert.equal(rebuilt.hammerScale, 0.35);
    assert.equal(typeof rebuilt.f, "function");
  });
  it("integriert lineare Weierstrass-Daten mit der Mittelpunktregel exakt", () => {
    const [points] = pointGridsFor({
      uRange: [0, 1],
      vRange: [0, 0],
      uSegments: 1,
      vSegments: 1,
      parameter: radius => C$(radius, 0),
      f: C$("z => z"),
      g: C$("z => 0")
    });
    assert.ok(Math.abs(points[0][1][0] - 1 / 4) < 1e-12);
    assert.ok(Math.abs(points[0][1][1]) < 1e-12);
    assert.ok(Math.abs(points[0][1][2]) < 1e-12);
  });
  it("Kusner: p=9 verwendet ein ausgewogenes Gitter", () => {
    const rebuilt = findSurface("Kusner").withParameters({ p: 9 });
    assert.equal(rebuilt.uSegments, 121);
    assert.equal(rebuilt.vSegments, 793);
    assert.ok((rebuilt.uSegments + 1) * (rebuilt.vSegments + 1) < 100_000);
  });
  it("Kusner: alle p-Werte bleiben mit Sicherheitsabstand zwischen den Polen", () => {
    const kusner = findSurface("Kusner");
    [3, 5, 7, 9, 11, 13, 15, 17].forEach(p => {
      const rebuilt = kusner.withParameters({ p });
      const A = Math.sqrt(2 * p - 1);
      const B = 2 * A / (p - 1);
      const rootSpan = Math.sqrt(B ** 2 + 4);
      const poles = [
        ((rootSpan - B) / 2) ** (1 / p),
        ((rootSpan + B) / 2) ** (1 / p)
      ];
      assert.ok([...rebuilt.uBounds, ...rebuilt.uRange].every(value => Number.isFinite(value) && value > 0));
      assert.ok(poles[0] < rebuilt.uBounds[0]);
      assert.ok(rebuilt.uBounds[0] < rebuilt.uRange[0]);
      assert.equal(rebuilt.uRange[0], 1);
      assert.ok(rebuilt.uRange[0] < rebuilt.uRange[1]);
      assert.ok(rebuilt.uRange[1] <= rebuilt.uBounds[1]);
      assert.ok(rebuilt.uBounds[1] < poles[1]);
      if (p !== 7) {
        assert.ok(Math.abs((poles[1] - rebuilt.uRange[1]) / (poles[1] - poles[0]) - 0.12) < 1e-12);
      }
    });
  });
  it("normalizeParameters ist fuer Standardwerte idempotent", () =>
    surfaces.filter(surface => surface.normalizeParameters).forEach(surface => {
      const defaults = Object.fromEntries(
        Object.entries(surface.parameters).map(([key, parameter]) => [key, parameter.value])
      );
      const normalized = surface.normalizeParameters(defaults);
      assert.deepEqual(surface.normalizeParameters(normalized), normalized, surface.name);
    })
  );
  it("Cobra: normalisiert m und t und baut die Formeln neu auf", () => {
    const surface = findSurface("Cobra");
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
  it("S41-Morph: normalisiert j < n < m und verbindet zwei S41-Flaechen", () => {
    const surface = findSurface("S41-Morph");
    assert.deepEqual(surface.normalizeParameters({ m: 4, n: 8, j: 6, alpha: 120 }), { m: 5, n: 3, j: 1, alpha: 90, beta: 0 });
    assert.deepEqual(surface.normalizeParameters({ alpha: 30, beta: 400 }), { m: 5, n: 3, j: 1, alpha: 30, beta: 360 });
    const rebuilt = surface.withParameters({ m: 7, n: 5, j: 3, alpha: 20 });
    assert.match(rebuilt.fText, /z\^8$/);
    assert.match(rebuilt.gText, /^z => z\^2 \* \(z\^5 - c \* z\^2 - s\)/);
    assert.ok(allPoints(pointGridsFor(rebuilt)).every(isFiniteVector));

    const s41 = surfaces.find(candidate => candidate.name.trim().startsWith("S41_3_1"));
    const z = C$(1.07, 0.31);
    const sameData = (a, b) => Math.hypot(a.f(z).re - b.f(z).re, a.f(z).im - b.f(z).im) < 1e-12
      && Math.hypot(a.g(z).re - b.g(z).re, a.g(z).im - b.g(z).im) < 1e-12;
    assert.ok(sameData(surface.withParameters({ m: 5, n: 3, j: 1, alpha: 90 }), s41.withParameters({ m: 5, n: 3 })));
    assert.ok(sameData(surface.withParameters({ m: 5, n: 3, j: 1, alpha: 0 }), s41.withParameters({ m: 5, n: 1 })));
  });
  it("S41-Morph: die Flaeche schliesst sich auf dem Einheitskreis antipodal", () => {
    [0, 70, 180].forEach(beta => {
    const surface = findSurface("S41-Morph").withParameters({ m: 5, n: 3, j: 1, alpha: 45, beta });
    const steps = 4000;
    const halfTurn = Array.from({ length: steps }, (_, index) => {
      const angle = Math.PI * (index + 0.5) / steps;
      const point = C$(Math.cos(angle), Math.sin(angle));
      const dz = C$(-Math.sin(angle) * Math.PI / steps, Math.cos(angle) * Math.PI / steps);
      const f = surface.f(point);
      const g = surface.g(point);
      const product = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
      const g2 = product(g, g);
      return [
        product(product(f, { re: (1 - g2.re) / 2, im: -g2.im / 2 }), dz).re,
        product(product(product({ re: 0, im: 1 }, f), { re: (1 + g2.re) / 2, im: g2.im / 2 }), dz).re,
        product(product(f, g), dz).re
      ];
    }).reduce((sum, delta) => sum.map((value, axis) => value + delta[axis]), [0, 0, 0]);
    assert.ok(Math.hypot(...halfTurn) < 1e-5, `beta = ${beta}: X(-1) - X(1) = ${halfTurn}`);
    });
  });
  it("S41-Mix: normalisiert Gewichte und Phasen und trifft die drei S41-Ecken", () => {
    const surface = findSurface("S41-Mix");
    assert.deepEqual(
      surface.normalizeParameters({ m: 8, w1: 2, w3: -1, w5: 0.4, b3: 400, b5: -5 }),
      { m: 9, w1: 1, w3: 0, w5: 0.4, b3: 360, b5: 0 }
    );
    assert.deepEqual(
      surface.normalizeParameters({ w1: 0, w3: 0, w5: 0 }),
      { m: 7, w1: 0, w3: 0, w5: 1, b3: 0, b5: 0 }
    );
    const rebuilt = surface.withParameters({ m: 9, w1: 0.3, w3: 1, w5: 0.6, b3: 77, b5: 201 });
    assert.match(rebuilt.fText, /z\^10$/);
    assert.match(rebuilt.gText, /^z => z\^4 \* /);
    assert.ok(allPoints(pointGridsFor(rebuilt)).every(isFiniteVector));

    const s41 = surfaces.find(candidate => candidate.name.trim().startsWith("S41_3_1"));
    const z = C$(1.07, 0.31);
    const distance = (a, b) => Math.hypot(a.re - b.re, a.im - b.im);
    [[1, { w1: 1, w3: 0, w5: 0 }], [3, { w1: 0, w3: 1, w5: 0 }], [5, { w1: 0, w3: 0, w5: 1 }]].forEach(([n, weights]) => {
      const corner = surface.withParameters({ m: 7, b3: 0, b5: 0, ...weights });
      const reference = s41.withParameters({ m: 7, n });
      assert.ok(distance(corner.f(z), reference.f(z)) < 1e-12, `f, n = ${n}`);
      assert.ok(distance(corner.g(z), reference.g(z)) < 1e-12, `g, n = ${n}`);
    });
  });
  it("S41-Mix: die Flaeche schliesst sich fuer beliebige Gewichte und Phasen", () => {
    const product = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
    [
      { m: 7, w1: 1, w3: 1, w5: 1, b3: 0, b5: 0 },
      { m: 9, w1: 0.3, w3: 1, w5: 0.6, b3: 77, b5: 201 },
      { m: 13, w1: 1, w3: 0.2, w5: 0.05, b3: 300, b5: 45 }
    ].forEach(values => {
      const surface = findSurface("S41-Mix").withParameters(values);
      const steps = 4000;
      const halfTurn = Array.from({ length: steps }, (_, index) => {
        const angle = Math.PI * (index + 0.5) / steps;
        const point = C$(Math.cos(angle), Math.sin(angle));
        const dz = { re: -Math.sin(angle) * Math.PI / steps, im: Math.cos(angle) * Math.PI / steps };
        const f = surface.f(point);
        const g = surface.g(point);
        const g2 = product(g, g);
        return [
          product(product(f, { re: (1 - g2.re) / 2, im: -g2.im / 2 }), dz).re,
          product(product(product({ re: 0, im: 1 }, f), { re: (1 + g2.re) / 2, im: g2.im / 2 }), dz).re,
          product(product(f, g), dz).re
        ];
      }).reduce((sum, delta) => sum.map((value, axis) => value + delta[axis]), [0, 0, 0]);
      assert.ok(Math.hypot(...halfTurn) < 1e-5, `${JSON.stringify(values)}: X(-1) - X(1) = ${halfTurn}`);
    });
  });
  it("S41-Symmetrisch: normalisiert die Parameter und haelt N und k teilerfremd", () => {
    const surface = findSurface("S41-Symmetrisch");
    assert.deepEqual(surface.normalizeParameters({ N: 4, k: 2, tau: 5, beta: -3 }), { N: 5, k: 3, tau: 2, beta: 0 });
    assert.deepEqual(surface.normalizeParameters({ N: 3, k: 3 }), { N: 3, k: 5, tau: 0.6, beta: 0 });
    assert.deepEqual(surface.normalizeParameters({ N: 7, k: 7 }), { N: 7, k: 5, tau: 0.6, beta: 0 });
    const rebuilt = surface.withParameters({ N: 5, k: 3, tau: 0.8, beta: 40 });
    assert.match(rebuilt.fText, /z\^14$/);
    assert.match(rebuilt.gText, /^z => z\^3 \* \(z\^10 - a \* z\^5 \+ b\)/);
    assert.equal(rebuilt.vSegments, 441);
    assert.ok(allPoints(pointGridsFor(rebuilt)).every(isFiniteVector));
  });
  it("S41-Symmetrisch: Weierstrass-Daten sind N-zaehlig drehsymmetrisch und tau = 0 ergibt S41", () => {
    const surface = findSurface("S41-Symmetrisch");
    const distance = (a, b) => Math.hypot(a.re - b.re, a.im - b.im);
    const product = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
    const unit = angle => ({ re: Math.cos(angle), im: Math.sin(angle) });
    [{ N: 3, k: 1, tau: 0.6, beta: 0 }, { N: 5, k: 3, tau: 1.4, beta: 250 }].forEach(values => {
      const rebuilt = surface.withParameters(values);
      const turn = TAU / values.N;
      const z = { re: 1.07, im: 0.31 };
      const rotated = product(z, unit(turn));
      const at = point => C$(point.re, point.im);
      assert.ok(distance(rebuilt.g(at(rotated)), product(unit(values.k * turn), rebuilt.g(at(z)))) < 1e-10);
      assert.ok(distance(rebuilt.f(at(rotated)), product(unit(-(values.k + 1) * turn), rebuilt.f(at(z)))) < 1e-10);
    });
    const s41 = surfaces.find(candidate => candidate.name.trim().startsWith("S41_3_1")).withParameters({ m: 7, n: 3 });
    const base = surface.withParameters({ N: 3, k: 1, tau: 0, beta: 0 });
    const z = C$(1.07, 0.31);
    assert.ok(distance(base.f(z), s41.f(z)) < 1e-12);
    assert.ok(distance(base.g(z), s41.g(z)) < 1e-12);
  });
  it("S41-Symmetrisch: die Flaeche schliesst sich auf dem Einheitskreis antipodal", () => {
    const product = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
    [{ N: 3, k: 1, tau: 0.6, beta: 0 }, { N: 5, k: 3, tau: 1.4, beta: 250 }, { N: 7, k: 5, tau: 0.4, beta: 33 }].forEach(values => {
      const surface = findSurface("S41-Symmetrisch").withParameters(values);
      const steps = 6000;
      const halfTurn = Array.from({ length: steps }, (_, index) => {
        const angle = Math.PI * (index + 0.5) / steps;
        const dz = { re: -Math.sin(angle) * Math.PI / steps, im: Math.cos(angle) * Math.PI / steps };
        const f = surface.f(C$(Math.cos(angle), Math.sin(angle)));
        const g = surface.g(C$(Math.cos(angle), Math.sin(angle)));
        const g2 = product(g, g);
        return [
          product(product(f, { re: (1 - g2.re) / 2, im: -g2.im / 2 }), dz).re,
          product(product(product({ re: 0, im: 1 }, f), { re: (1 + g2.re) / 2, im: g2.im / 2 }), dz).re,
          product(product(f, g), dz).re
        ];
      }).reduce((sum, delta) => sum.map((value, axis) => value + delta[axis]), [0, 0, 0]);
      assert.ok(Math.hypot(...halfTurn) < 1e-4, `${JSON.stringify(values)}: X(-1) - X(1) = ${halfTurn}`);
    });
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
    const s41 = surfaces.find(surface => surface.name.trim().startsWith("S41_3_1"));
    assert.ok(s41);
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
