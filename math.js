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
const cAdd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
const cSub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
const cScale = (factor, z) => ({ re: factor * z.re, im: factor * z.im });
const cMul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cDiv = (a, b) => {
  const denominator = b.re ** 2 + b.im ** 2;
  return {
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator
  };
};

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

const cobraFamily = ({ name = "Cobra-Familie", m = 5, t = 1, r2 = 1.2, uSegments = 58, vSegments = 221 } = {}) =>
  surfaceWithFormulas({
    name,
    ...annulus(1, r2, uSegments, vSegments),
    fText: `z => t^2 * (z + 1)^2 * (z + i/t)^2 / z^${m + 1}`,
    gText: `z => z^${m - 2} * (z - 1) * (z - i*t) / (t * (z + 1) * (z + i/t))`,
    constants: { t },
    parameters: {
      m: { label: "m", min: 5, max: 11, step: 2, value: m, format: value => Math.round(value).toString() },
      t: { label: "t", min: 0.3, max: 3, step: 0.05, value: t, format: value => value.toFixed(2) }
    },
    normalizeParameters: values => ({
      m: oddInRange(values.m ?? m, 5, 11),
      t: clamp(0.3, Number(values.t ?? t), 3)
    }),
    withParameters: values => cobraFamily({ name, m: values.m, t: values.t, r2, uSegments, vSegments })
  });

const degree7 = ({ name = "Grad-7-Familie", cr = 0.7, ci = 0, r2 = 1.13, uSegments = 80, vSegments = 481 } = {}) =>
  surfaceWithFormulas({
    name,
    ...annulus(1, r2, uSegments, vSegments),
    fText: "z => i * ((1 + z) * (1 - i*z) * (1 + conj(c)*z))^2 / z^8",
    gText: "z => z^4 * (z - 1) * (z - i) * (z - c) / ((1 + z) * (1 - i*z) * (1 + conj(c)*z))",
    constants: { c: { re: cr, im: ci } },
    parameters: {
      cr: { label: "Re c", min: -2.5, max: 2.5, step: 0.1, value: cr, format: value => value.toFixed(2) },
      ci: { label: "Im c", min: -2.5, max: 2.5, step: 0.1, value: ci, format: value => value.toFixed(2) }
    },
    normalizeParameters: values => ({
      cr: clamp(-2.5, Number(values.cr), 2.5),
      ci: clamp(-2.5, Number(values.ci), 2.5)
    }),
    withParameters: values => degree7({ name, cr: values.cr, ci: values.ci, r2, uSegments, vSegments })
  });

const s42 = (r1 = 1.8, r2 = 3, uSegments = 58, vSegments = 301) => {
  const a = Math.sqrt(-5 + 2 * Math.sqrt(15));
  const gText = "z => z^3 * (z^2 - a^2) / ((a*z)^2 - 1)";
  const fText = 'z => i * ((a*z)^2 - 1)^2 / (z^2 * (z - 1)^4 * (z + 1)^4)';

  return surfaceWithFormulas({
    name: "S42",
    ...annulus(r1, r2, uSegments, vSegments),
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
  const vSegments = 361 + Math.round(p * 40);
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

const catenoidHelicoid = ({ angle = 0, r1 = 0.3, r2 = 3, uSegments = 70, vSegments = 180 } = {}) => {
  const normalizedAngle = clamp(0, Number(angle), 90);
  const alpha = normalizedAngle * Math.PI / 180;
  return surfaceWithFormulas({
    name: "Katenoid-Helikoid",
    ...annulus(r1, r2, uSegments, vSegments),
    fText: "z => -2 * exp(i * alpha) / z**2",
    gText: "z => z",
    constants: { alpha },
    parameters: {
      angle: { label: "Winkel", min: 0, max: 90, step: 1, value: normalizedAngle, format: value => `${Math.round(value)}°` }
    },
    normalizeParameters: values => ({ angle: clamp(0, Number(values.angle), 90) }),
    withParameters: values => catenoidHelicoid({ angle: values.angle, r1, r2, uSegments, vSegments })
  });
};

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

const hennebergPhase = m => ["1", "i", "-1", "-i"][(m - 1) % 4];
const henneberg = ({ name = "Henneberg", m = 5, r1 = 1.8, r2 = 2 } = {}) => {
  const normalizedM = clamp(1, Math.round(m), 9);
  const vSegments = 241 + 24 * normalizedM;

  return surfaceWithFormulas({
    name,
    ...annulus(r1, r2, 60, vSegments),
    fText: `z => ${hennebergPhase(normalizedM)} * (z^${2 * normalizedM + 2} - 1) / z^${normalizedM + 3}`,
    gText: "z => z",
    parameters: {
      m: { label: "m", min: 1, max: 9, step: 1, value: normalizedM, format: value => Math.round(value).toString() }
    },
    normalizeParameters: values => ({ m: clamp(1, Math.round(values.m), 9) }),
    resetDomainOnParameterChange: true,
    withParameters: values => henneberg({ name, m: values.m, r1, r2 })
  });
};

const COSTA_Q = Math.exp(-Math.PI);
const COSTA_E1 = 6.875185818020372;
const COSTA_A = 2 * Math.sqrt(2 * Math.PI) * COSTA_E1;
const cSin = z => ({ re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) });
const cCos = z => ({ re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) });
const costaThetaDerivatives = z => Array.from({ length: 4 }, (_, n) => {
  const k = 2 * n + 1;
  const coefficient = 2 * (n % 2 ? -1 : 1) * COSTA_Q ** ((n + 0.5) ** 2);
  const kz = cScale(k, z);
  return [
    cScale(coefficient, cSin(kz)),
    cScale(coefficient * k, cCos(kz)),
    cScale(-coefficient * k ** 2, cSin(kz)),
    cScale(-coefficient * k ** 3, cCos(kz))
  ];
}).reduce(
  (sums, derivatives) => sums.map((sum, index) => cAdd(sum, derivatives[index])),
  Array.from({ length: 4 }, () => ({ re: 0, im: 0 }))
);
const costaZeta = z => {
  const [theta, thetaPrime] = costaThetaDerivatives(cScale(Math.PI, z));
  return cScale(Math.PI, cAdd(z, cDiv(thetaPrime, theta)));
};
const costaWp = z => {
  const [theta, thetaPrime, thetaSecond] = costaThetaDerivatives(cScale(Math.PI, z));
  const logarithmicDerivative = cDiv(thetaPrime, theta);
  const logarithmicSecond = cSub(cDiv(thetaSecond, theta), cMul(logarithmicDerivative, logarithmicDerivative));
  return cSub({ re: -Math.PI, im: 0 }, cScale(Math.PI ** 2, logarithmicSecond));
};
const costaWpPrime = z => {
  const [theta, thetaPrime, thetaSecond, thetaThird] = costaThetaDerivatives(cScale(Math.PI, z));
  const first = cDiv(thetaPrime, theta);
  const third = cAdd(
    cSub(cDiv(thetaThird, theta), cScale(3, cMul(cDiv(thetaSecond, theta), first))),
    cScale(2, cMul(cMul(first, first), first))
  );
  return cScale(-(Math.PI ** 3), third);
};
const costaPoint = (u, v) => {
  const z = { re: u, im: v };
  const zeta = costaZeta(z);
  const shiftedZetas = cSub(costaZeta({ re: u - 0.5, im: v }), costaZeta({ re: u, im: v - 0.5 }));
  const correction = cScale(Math.PI / (2 * COSTA_E1), shiftedZetas);
  const linear = cScale(Math.PI, z);
  const wp = costaWp(z);
  const heightRatio = cDiv(cSub(wp, { re: COSTA_E1, im: 0 }), cAdd(wp, { re: COSTA_E1, im: 0 }));
  return [
    cAdd(cAdd(cNeg(zeta), linear), correction).re / 2,
    cMul({ re: 0, im: -1 }, cAdd(cAdd(zeta, linear), correction)).re / 2,
    Math.sqrt(2 * Math.PI) / 4 * Math.log(Math.hypot(heightRatio.re, heightRatio.im))
  ];
};
const torusDistance = (a, b) => {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1 - distance);
};
const torusDelta = (value, center) => value - center - Math.round(value - center);
const wrapUnit = value => (value % 1 + 1) % 1;
const costaPunctures = [[0, 0], [0.5, 0], [0, 0.5]];
const costaBoundaryNode = (node, cutoff) => {
  const nearest = costaPunctures.map(([u, v]) => {
    const du = torusDelta(node.u, u);
    const dv = torusDelta(node.v, v);
    return { u, v, du, dv, distance: Math.hypot(du, dv) };
  }).sort((a, b) => a.distance - b.distance)[0];
  const scale = cutoff / nearest.distance;
  return {
    u: wrapUnit(nearest.u + nearest.du * scale),
    v: wrapUnit(nearest.v + nearest.dv * scale)
  };
};
const costaMesh = data => {
  const columns = data.uSegments;
  const rows = data.vSegments;
  const nodes = Array.from({ length: rows * columns }, (_, node) => {
    const column = node % columns;
    const row = Math.floor(node / columns);
    const u = column / columns;
    const v = row / rows;
    const valid = costaPunctures.every(([pu, pv]) => Math.hypot(torusDistance(u, pu), torusDistance(v, pv)) >= data.cutoff);
    return { node, column, row, u, v, valid };
  });
  const validNodes = nodes.filter(node => node.valid);
  const vertexByNode = new Map(validNodes.map((node, vertex) => [node.node, vertex]));
  const nodeAt = (row, column) => (row % rows) * columns + column % columns;
  const vertexAt = (row, column) => vertexByNode.get(nodeAt(row, column));
  const indices = nodes.flatMap(({ row, column }) => {
    const vertices = [
      vertexAt(row, column),
      vertexAt(row, column + 1),
      vertexAt(row + 1, column),
      vertexAt(row + 1, column + 1)
    ];
    return vertices.every(vertex => vertex !== undefined)
      ? [vertices[0], vertices[1], vertices[3], vertices[0], vertices[3], vertices[2]]
      : [];
  });
  const edgeCounts = Array.from({ length: indices.length / 3 }, (_, face) => indices.slice(3 * face, 3 * face + 3))
    .flatMap(([a, b, c]) => [[a, b], [b, c], [c, a]])
    .reduce((counts, [a, b]) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      return counts;
    }, new Map());
  const boundaryVertices = new Set([...edgeCounts]
    .filter(([, count]) => count === 1)
    .flatMap(([key]) => key.split(",").map(Number)));
  const rowStep = Math.max(1, Math.round(rows / 26));
  const columnStep = Math.max(1, Math.round(columns / 24));
  const lineIndices = nodes.flatMap(({ row, column }) => [
    ...(row % rowStep === 0 ? [[vertexAt(row, column), vertexAt(row, column + 1)]] : []),
    ...(column % columnStep === 0 ? [[vertexAt(row, column), vertexAt(row + 1, column)]] : [])
  ]).filter(edge => edge.every(vertex => vertex !== undefined));
  return {
    points: validNodes.map((node, vertex) => {
      const { u, v } = boundaryVertices.has(vertex) ? costaBoundaryNode(node, data.cutoff) : node;
      return costaPoint(u, v);
    }),
    indices,
    lineIndices
  };
};
const costa = ({ cutoff = 0.12, uSegments = 160, vSegments = 160 } = {}) => surfaceWithFormulas({
  name: "Costa",
  uRange: [0, 1],
  vRange: [0, 1],
  uSegments,
  vSegments,
  cutoff,
  fixedDomain: true,
  initialView: { camera: [2.65, -3.6, 1.75], target: [0, 0, 0] },
  fText: "z => wp(z)",
  gText: "z => A / wpPrime(z)",
  constants: { wp: costaWp, wpPrime: costaWpPrime, A: COSTA_A },
  parameters: {
    cutoff: { label: "Endenausschnitt ε", min: 0.025, max: 0.18, step: 0.005, value: cutoff, format: value => value.toFixed(3) }
  },
  normalizeParameters: values => ({ cutoff: clamp(0.025, Number(values.cutoff), 0.18) }),
  withParameters: values => costa({ cutoff: values.cutoff, uSegments, vSegments }),
  mesh: costaMesh
});

const outsideCycle = surface => ({ ...surface, cycle: false });

export const surfaces = [
  s41({ name: "S41_3_1 - Meeks Möbiusband (Twisted Catenoid)", m: 3, n: 1, r1: 1.0, r2: 2.0 }),
  s41({ name: "S41_5_3 Trefoil         ", m: 5, n: 3, r1: 1.0, r2: 1.5 }),
  s41({ name: "S41_5_3 Double Trefoil  ", m: 5, n: 3, r1: 1.1, r2: 1.5 }),
  s41({ name: "S41_7_5                 ", m: 7, n: 5, r1: 1.1, r2: 1.3 }),
  cobra({ name: "Cobra", m: 5, r1: 1, r2: 1.2 }),
  cobraFamily(),
  kusner({ name: "Kusner" }),
  richmond(),
  henneberg(),
  costa(),
  outsideCycle(degree7()),
  outsideCycle(s41({ name: "S41_5_1 UFO             ", m: 5, n: 1, r1: 1.0, r2: 1.3 })),
  outsideCycle(s42()),
  outsideCycle(catenoidHelicoid()),
  outsideCycle(lopezKlein()),
  outsideCycle(enneper())
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

export const pointGridsFor = data => data.mesh ? [[data.mesh(data).points]] : data.pointGrids ? data.pointGrids(data) : [buildPointGrid(data)];

export const normalizePointGrids = pointGrids => {
  const allPoints = pointGrids.flat(2).filter(finiteVector);
  const safePoints = allPoints.length > 0 ? allPoints : [[0, 0, 0]];
  const midpoint = [0, 1, 2].map(axis =>
    safePoints.reduce((sum, point) => sum + point[axis], 0) / safePoints.length
  );
  const centered = safePoints.map(point => vSub(point, midpoint));
  const radius = centered.reduce((maximum, point) => Math.max(maximum, vLength(point)), 0) || 1;
  const normalizePoint = point => finiteVector(point) ? vSub(point, midpoint).map(value => value / radius) : [0, 0, 0];
  return pointGrids.map(points => points.map(row => row.map(normalizePoint)));
};
