import { C$ } from "./complex.js";

export const TAU = Math.PI * 2;
const SEAM_OVERLAP = 0.1;
const center = C$("(za, ze) => (za + ze) / 2");
const diff = C$("(za, ze) => ze - za");
const phis = [
  C$("(f, g, dz) => f * (1 - g^2) / 2 * dz"),
  C$("(f, g, dz) => i * f * (1 + g^2) / 2 * dz"),
  C$("(f, g, dz) => f * g * dz")
];

const vAdd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vLength = v => Math.hypot(v[0], v[1], v[2]) || 1;
const finiteVector = v => v.every(Number.isFinite);
const cNeg = z => ({ re: -z.re, im: -z.im });
const cAvg = (a, b) => ({ re: (a.re + b.re) / 2, im: (a.im + b.im) / 2 });
const cDistance = (a, b) => Math.hypot(a.re - b.re, a.im - b.im);
const cNear = (value, target) => cDistance(value, target) <= cDistance(cNeg(value), target) ? value : cNeg(value);

const range = (min, max, segments) => Array.from(
  { length: segments + 1 },
  (_, index) => min + (max - min) * index / segments
);
export const clamp = (min, value, max) => Math.min(max, Math.max(min, value));

const annulus = (r1, r2, uSegments = 60, vSegments = 181) => ({
  uRange: [r1, r2],
  vRange: [0, TAU + SEAM_OVERLAP],
  uSegments,
  vSegments,
  parameter: (radius, angle) => C$(radius * Math.cos(angle), radius * Math.sin(angle)),
  domainText: `${r1} <= |z| <= ${r2}`
});

const zPowerText = n => n === 0 ? "1" : n === 1 ? "z" : `z^${n}`;
const oddInRange = (value, min, max) => clamp(min, Math.round(value) | 1, max);
const surfaceWithFormulas = ({ fText, gText, constants = {}, ...surface }) => ({
  ...surface,
  f: C$(fText, constants),
  g: C$(gText, constants),
  fText,
  gText
});

const kusnerRadiusRange = p => {
  const A = Math.sqrt(2 * p - 1);
  const B = 2 * A / (p - 1);
  const rootSpan = Math.sqrt(B ** 2 + 4);
  const innerPole = ((rootSpan - B) / 2) ** (1 / p);
  const outerPole = ((rootSpan + B) / 2) ** (1 / p);
  const margin = Math.min(0.24, (outerPole - innerPole) * 0.38);
  return [innerPole + margin, outerPole - margin];
};

const s41 = ({ name, m, n, r1 = 1, r2 = 1.2, uSegments = 58, vSegments = 221 }) => surfaceWithFormulas({
  name,
  ...annulus(r1, r2, uSegments, vSegments),
  fText: `z => i * (${zPowerText(n)} + 1)^2 / z^${m + 1}`,
  gText: `z => ${zPowerText(m - n)} * (${zPowerText(n)} - 1) / (${zPowerText(n)} + 1)`,
  parameters: {
    m: { label: "m", min: 3, max: 13, step: 2, value: m, format: value => Math.round(value).toString() },
    n: { label: "n", min: 1, max: 11, step: 2, value: n, format: value => Math.round(value).toString() }
  },
  normalizeParameters: values => {
    const nextM = oddInRange(values.m, 3, 13);
    const nextN = oddInRange(values.n, 1, nextM - 2);
    return { m: nextM, n: nextN };
  },
  withParameters: values => s41({ name, ...values, r1, r2, uSegments, vSegments })
});

const cobra = ({ name, m = 5, r1, r2, uSegments = 58, vSegments = 221 }) => surfaceWithFormulas({ // S39
  name,
  ...annulus(r1, r2, uSegments, vSegments),
  fText: `z => (z + 1)^2 * (z + i)^2 / z^${m + 1}`,
  gText: `z => z^${m - 2} * (z - 1) * (z - i) / ((z + 1) * (z + i))`,
  parameters: { m: { label: "m", min: 5, max: 11, step: 2, value: m, format: value => Math.round(value).toString() } },
  withParameters: values => cobra({ name, m: Math.round(values.m), r1, r2, uSegments, vSegments })
});

const s42 = (r1 = 1.8, r2 = 3) => {
  const a = Math.sqrt(-5 + 2 * Math.sqrt(15));
  const gText = "z => z^3 * (z^2 - a^2) / ((a*z)^2 - 1)";
  const fText = 'z => i * ((a*z)^2 - 1)^2 / (z^2 * (z - 1)^4 * (z + 1)^4)';

  return surfaceWithFormulas({
    name: "S42",
    ...annulus(r1, r2, 70, 221),
    fText,
    gText,
    constants: { a }
  });
};

const kusner = ({ name = "Kusner", p = 5, r1, r2 }) => {
  const A = Math.sqrt(2 * p - 1);
  const B = 2 * A / (p - 1);
  const zp = zPowerText(p);
  const uSegments = 70 + Math.round(p * 4);
  const vSegments = 241 + Math.round(p * 28);
  const radiusRange = kusnerRadiusRange(p);

  return surfaceWithFormulas({
    name,
    ...annulus(r1 ?? radiusRange[0], r2 ?? radiusRange[1], uSegments, vSegments),
    fText: `z => i * (A * ${zp} + 1)^2 / (${zPowerText(2 * p)} + B * ${zp} - 1)^2`,
    gText: `z => ${zPowerText(p - 1)} * (${zp} - A) / (A * ${zp} + 1)`,
    constants: { A, B },
    parameters: {
      p: { label: "p", min: 3, max: 17, step: 2, value: p, format: value => Math.round(value).toString() }
    },
    normalizeParameters: values => ({ p: oddInRange(values.p, 3, 17) }),
    resetDomainOnParameterChange: true,
    withParameters: values => kusner({ name, p: values.p })
  });
};

const lopezNodeGrid = (data, w) => {
  const us = range(data.uRange[0], data.uRange[1], data.uSegments);
  const vs = range(data.vRange[0], data.vRange[1], data.vSegments);
  const zGrid = vs.map(angle => us.map(radius => data.parameter(radius, angle)));
  const wGrid = zGrid.reduce((rows, zRow, row) => [
    ...rows,
    zRow.reduce((columns, z, column) => {
      const principal = w(z);
      const target = row > 0 && column > 0
        ? cAvg(columns[column - 1], rows[row - 1][column])
        : row > 0
          ? rows[row - 1][column]
          : column > 0
            ? columns[column - 1]
            : principal;
      const value = cNear(principal, target);
      return [...columns, value];
    }, [])
  ], []);
  return { zGrid, wGrid };
};

const lopezSegmentDelta = (z0, w0, z1, w1, f, g, w) => {
  const z = center(z0, z1);
  const dz = diff(z0, z1);
  const wz = cNear(w(z), cAvg(w0, w1));
  const fz = f(z, wz);
  const gz = g(z, wz);
  const delta = phis.map(phi => phi(fz, gz, dz).re);
  return finiteVector(delta) ? delta : [0, 0, 0];
};

const lopezSheetPoints = ({ zGrid, wGrid }, f, g, w) => {
  const points = zGrid.map(row => row.map(() => [0, 0, 0]));

  zGrid[0].slice(1).forEach((_, offset) => {
    const column = offset + 1;
    points[0][column] = vAdd(
      points[0][column - 1],
      lopezSegmentDelta(zGrid[0][column - 1], wGrid[0][column - 1], zGrid[0][column], wGrid[0][column], f, g, w)
    );
  });

  zGrid.slice(1).forEach((_, offset) => {
    const row = offset + 1;
    zGrid[row].forEach((z, column) => {
      points[row][column] = vAdd(
        points[row - 1][column],
        lopezSegmentDelta(zGrid[row - 1][column], wGrid[row - 1][column], z, wGrid[row][column], f, g, w)
      );
    });
  });

  return points;
};

const lopezPointGrids = (data, w, f, g) => [lopezSheetPoints(lopezNodeGrid(data, w), f, g, w)];

const lopezKlein = () => {
  const r = -0.392973;
  const wText = "sqrt(z * (z - r) / (r * z + 1))";
  const w = C$(`z => ${wText}`, { r });
  const f = C$("(z, w) => i * (z + 1)^2 / (z^2 * w)");
  const g = C$("(z, w) => w * (z - 1) / (z + 1)");

  return surfaceWithFormulas({
    name: "Lopez Klein Bottle",
    ...annulus(0.405, 2.45, 76, 241),
    vRange: [0.03, TAU + SEAM_OVERLAP],
    fText: `z => i * (z + 1)^2 / (z^2 * ${wText})`,
    gText: `z => ${wText} * (z - 1) / (z + 1)`,
    constants: { r },
    pointGrids: data => lopezPointGrids(data, w, f, g)
  });
};

const catenoid = () => surfaceWithFormulas({
  name: "Catenoid",
  ...annulus(0.3, 3, 70, 180),
  fText: "z => -2 / z**2",
  gText: "z => z"
});

const enneper = () => surfaceWithFormulas({
  name: "Enneper",
  ...annulus(0.02, 1.5, 60, 180),
  fText: "z => 1",
  gText: "z => z"
});

const richmond = ({ name = "Richmond", n = 2, r1 = 0.25, r2 = 1.5, uSegments = 60, vSegments = 180 } = {}) => surfaceWithFormulas({
  name,
  ...annulus(r1, r2, uSegments, vSegments),
  fText: "z => 1 / z^2",
  gText: `z => z^${n}`,
  parameters: {
    n: { label: "n", min: 1, max: 6, step: 1, value: n, format: value => Math.round(value).toString() }
  },
  normalizeParameters: values => ({ n: clamp(1, Math.round(values.n), 6) }),
  withParameters: values => richmond({ name, n: values.n, r1, r2, uSegments, vSegments })
});

export const surfaces = [
  s41({ name: "S41_3_1 Twisted Catenoid", m: 3, n: 1, r1: 1.0, r2: 2.0 }),
  s41({ name: "S41_5_1 UFO             ", m: 5, n: 1, r1: 1.0, r2: 1.3 }),
  s41({ name: "S41_5_3 Trefoil         ", m: 5, n: 3, r1: 1.0, r2: 1.5 }),
  s41({ name: "S41_5_3 Double Trefoil  ", m: 5, n: 3, r1: 1.1, r2: 1.5 }),
  s41({ name: "S41_7_5                 ", m: 7, n: 5, r1: 1.1, r2: 1.3 }),
  cobra({ name: "Cobra", m: 5, r1: 1, r2: 1.2 }),
  kusner({ name: "Kusner" }),
  lopezKlein(),
  catenoid(),
  enneper(),
  richmond()
];

const weierstrass = data => z => {
  const fz = data.f(z);
  const gz = data.g(z);
  return dz => phis.map(phi => phi(fz, gz, dz).re);
};

const pointFor = (u, v, data) => data.parameter ? data.parameter(u, v) : C$(u, v);

const segmentDelta = (z0, z1, data) => {
  const dz = diff(z0, z1);
  const delta = weierstrass(data)(center(z0, z1))(dz);
  return finiteVector(delta) ? delta : [0, 0, 0];
};

const buildPointGrid = data => {
  const us = range(data.uRange[0], data.uRange[1], data.uSegments);
  const vs = range(data.vRange[0], data.vRange[1], data.vSegments);
  const points = vs.map(() => us.map(() => [0, 0, 0]));

  us.slice(1).forEach((_, offset) => {
    const column = offset + 1;
    const z0 = pointFor(us[column - 1], vs[0], data);
    const z1 = pointFor(us[column], vs[0], data);
    points[0][column] = vAdd(points[0][column - 1], segmentDelta(z0, z1, data));
  });

  vs.slice(1).forEach((_, offset) => {
    const row = offset + 1;
    us.forEach((u, column) => {
      const z0 = pointFor(u, vs[row - 1], data);
      const z1 = pointFor(u, vs[row], data);
      points[row][column] = vAdd(points[row - 1][column], segmentDelta(z0, z1, data));
    });
  });

  return points;
};

export const pointGridsFor = data => data.pointGrids ? data.pointGrids(data) : [buildPointGrid(data)];

export const normalizePointGrids = pointGrids => {
  const allPoints = pointGrids.flat(2).filter(finiteVector);
  const safePoints = allPoints.length > 0 ? allPoints : [[0, 0, 0]];
  const midpoint = [0, 1, 2].map(axis =>
    safePoints.reduce((sum, point) => sum + point[axis], 0) / safePoints.length
  );
  const centered = safePoints.map(point => vSub(point, midpoint));
  const radius = Math.max(...centered.map(vLength)) || 1;
  const normalizePoint = point => finiteVector(point) ? vSub(point, midpoint).map(value => value / radius) : [0, 0, 0];
  return pointGrids.map(points => points.map(row => row.map(normalizePoint)));
};
