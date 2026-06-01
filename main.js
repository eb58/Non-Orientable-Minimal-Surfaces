import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { C$ } from "./vendor/complex/c-dollar.js";

const TAU = Math.PI * 2;
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

const range = (min, max, segments) => Array.from(
  { length: segments + 1 },
  (_, index) => min + (max - min) * index / segments
);

const annulus = (r1, r2, uSegments = 60, vSegments = 181) => ({
  uRange: [r1, r2],
  vRange: [0, TAU],
  uSegments,
  vSegments,
  parameter: (radius, angle) => C$(radius * Math.cos(angle), radius * Math.sin(angle)),
  domainText: `${r1} <= |z| <= ${r2}`
});

const rectangle = (u1, u2, v1, v2, uSegments = 80, vSegments = 80) => ({
  uRange: [u1, u2],
  vRange: [v1, v2],
  uSegments,
  vSegments,
  domainText: `${u1} <= Re z <= ${u2}, ${v1} <= Im z <= ${v2}`
});

const zPowerText = n => n === 0 ? "1" : n === 1 ? "z" : `z^${n}`;

const s41 = ({ name, m, n, r1 = 1, r2 = 1.2, uSegments = 58, vSegments = 221 }) => ({
  name,
  ...annulus(r1, r2, uSegments, vSegments),
  f: C$("z => i * (z^n + 1)^2 / z^(m + 1)", { m, n }),
  g: C$("z => z^(m - n) * (z^n - 1) / (z^n + 1)", { m, n }),
  fText: `z => i * (${zPowerText(n)} + 1)^2 / z^${m + 1}`,
  gText: `z => ${zPowerText(m - n)} * (${zPowerText(n)} - 1) / (${zPowerText(n)} + 1)`
});

const cobra = ({ name, m, r1, r2, uSegments = 58, vSegments = 221 }) => ({
  name,
  ...annulus(r1, r2, uSegments, vSegments),
  f: C$("z => (z + 1)^2 * (z + i)^2 / z^(m + 1)", { m }),
  g: C$("z => z^(m - 2) * (z - 1) * (z - i) / ((z + 1) * (z + i))", { m }),
  fText: `z => (z + 1)^2 * (z + i)^2 / z^${m + 1}`,
  gText: `z => z^${m - 2} * (z - 1) * (z - i) / ((z + 1) * (z + i))`
});

const surfaces = [
  {
    name: "Catenoid",
    ...annulus(0.3, 3, 70, 180),
    f: C$("z => -2 / z^2"),
    g: C$("z => z"),
    fText: "z => -2 / z^2",
    gText: "z => z"
  },
  s41({ name: "Twisted Catenoid", m: 3, n: 1, r1: 1, r2: 2 }),
  cobra({ name: "Cobra", m: 5, r1: 1, r2: 1.2 }),
  cobra({ name: "Cobra 7", m: 7, r1: 1, r2: 1.1 }),
  cobra({ name: "Cobra 9", m: 9, r1: 1, r2: 1.05 }),
  s41({ name: "Trefoil", m: 5, n: 3, r1: 1, r2: 1.5 }),
  s41({ name: "Double Trefoil", m: 5, n: 3, r1: 1.1, r2: 1.5 }),
  s41({ name: "UFO", m: 5, n: 1, r1: 1, r2: 1.1 }),
  {
    name: "Enneper",
    ...rectangle(-1.35, 1.35, -1.35, 1.35, 82, 82),
    f: C$("z => 1"),
    g: C$("z => z"),
    fText: "z => 1",
    gText: "z => z"
  },
  {
    name: "Catenoid, log-Parameter",
    ...rectangle(-1.45, 1.45, 0, TAU, 78, 104),
    f: C$("z => exp(-z)"),
    g: C$("z => exp(z)"),
    fText: "z => exp(-z)",
    gText: "z => exp(z)"
  }
];

const canvas = document.querySelector("#surface");
const resetButton = document.querySelector("#reset-view");
const surfaceName = document.querySelector("#surface-name");
const formulaF = document.querySelector("#formula-f");
const formulaG = document.querySelector("#formula-g");
const domainInfo = document.querySelector("#domain-info");
const surfaceButtons = document.querySelector("#surface-buttons");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
const surfaceGroup = new THREE.Group();

const material = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  vertexColors: true,
  metalness: 0.02,
  roughness: 0.36,
  clearcoat: 0.45,
  clearcoatRoughness: 0.5,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.96
});
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x0f2e3a,
  transparent: true,
  opacity: 0.18
});

controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.4;
controls.maxDistance = 8;
controls.enablePan = false;

scene.add(surfaceGroup);
scene.add(new THREE.HemisphereLight(0xf5fbff, 0x7aa6b3, 2.8));
scene.add(((light) => { light.position.set(-2.6, -3.2, 4.4); return light; })(new THREE.DirectionalLight(0xffffff, 3.4)));
scene.add(((light) => { light.position.set(3.2, 2.1, 2.5); return light; })(new THREE.DirectionalLight(0x9ee9ff, 1.3)));

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

const buildPoints = data => {
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

const normalizePoints = points => {
  const allPoints = points.flat().filter(finiteVector);
  const safePoints = allPoints.length > 0 ? allPoints : [[0, 0, 0]];
  const center = [0, 1, 2].map(axis =>
    safePoints.reduce((sum, point) => sum + point[axis], 0) / safePoints.length
  );
  const centered = safePoints.map(point => vSub(point, center));
  const radius = Math.max(...centered.map(vLength)) || 1;
  return points.map(row => row.map(point => finiteVector(point) ? vSub(point, center).map(value => value / radius) : [0, 0, 0]));
};

const colorForPoint = point => {
  const height = (point[2] + 1) / 2;
  const radius = Math.hypot(point[0], point[1]);
  const angle = (Math.atan2(point[1], point[0]) + TAU) / TAU;
  const hue = (0.03 + 0.68 * height + 0.34 * angle + 0.12 * Math.min(1, radius)) % 1;
  const saturation = 0.82 + 0.12 * Math.min(1, radius);
  const lightness = 0.48 + 0.18 * height;
  return new THREE.Color().setHSL(hue, saturation, lightness);
};

const colorAttribute = points => new THREE.Float32BufferAttribute(
  points.flatMap(row => row.flatMap(point => colorForPoint(point).toArray())),
  3
);

const makeIndices = points => {
  const columns = points[0].length;
  return points.slice(0, -1).flatMap((row, rowIndex) =>
    row.slice(0, -1).flatMap((_, column) => {
      const p00 = rowIndex * columns + column;
      const p10 = p00 + 1;
      const p01 = p00 + columns;
      const p11 = p01 + 1;
      return [p00, p10, p11, p00, p11, p01];
    })
  );
};

const makeLinePositions = points => {
  const rowStep = Math.max(1, Math.round((points.length - 1) / 18));
  const columnStep = Math.max(1, Math.round((points[0].length - 1) / 16));
  const horizontal = points
    .filter((_, row) => row % rowStep === 0 || row === points.length - 1)
    .flatMap(row => row.slice(0, -1).flatMap((point, column) => [...point, ...row[column + 1]]));
  const vertical = points[0]
    .filter((_, column) => column % columnStep === 0 || column === points[0].length - 1)
    .flatMap((_, column) => points.slice(0, -1).flatMap((row, rowIndex) => [...row[column], ...points[rowIndex + 1][column]]));
  return [...horizontal, ...vertical];
};

const surfaceGeometry = data => {
  const points = normalizePoints(buildPoints(data));
  const geometry = new THREE.BufferGeometry();
  const lineGeometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(2), 3));
  geometry.setAttribute("color", colorAttribute(points));
  geometry.setIndex(makeIndices(points));
  geometry.computeVertexNormals();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(makeLinePositions(points), 3));
  return { geometry, lineGeometry };
};

const disposeSurface = () => {
  surfaceGroup.children.forEach(child => child.geometry.dispose());
  surfaceGroup.clear();
};

const setSurface = data => {
  const geometries = surfaceGeometry(data);
  disposeSurface();
  surfaceGroup.add(new THREE.Mesh(geometries.geometry, material));
  surfaceGroup.add(new THREE.LineSegments(geometries.lineGeometry, lineMaterial));
  surfaceName.textContent = data.name;
  formulaF.textContent = data.fText;
  formulaG.textContent = data.gText;
  domainInfo.textContent = data.domainText;
  [...surfaceButtons.children].forEach(button => button.classList.toggle("active", button.dataset.surface === data.name));
};

const resetView = () => {
  camera.position.set(1.95, -3.35, 1.45);
  controls.target.set(0, 0, 0);
  controls.update();
};

const resize = () => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

const createSurfaceButton = data => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "surface-option";
  button.dataset.surface = data.name;
  button.textContent = data.name;
  button.addEventListener("click", () => setSurface(data));
  return button;
};

surfaceButtons.append(...surfaces.map(createSurfaceButton));
resetButton.addEventListener("click", resetView);
window.addEventListener("resize", resize);

resetView();
setSurface(surfaces[0]);
resize();
animate();
