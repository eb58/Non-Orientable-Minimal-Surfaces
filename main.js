import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { C$ } from "./vendor/complex/C$.js";

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
const clamp = (min, value, max) => Math.min(max, Math.max(min, value));
const formatNumber = value => Number(value).toFixed(2);
const sliderBounds = rangeValues => {
  const span = rangeValues[1] - rangeValues[0];
  const padding = Math.max(0.25, Math.abs(span) * 0.8);
  return [rangeValues[0] - padding, rangeValues[1] + padding];
};
const domainKey = surface => surface.name;
const defaultDomain = surface => ({
  uRange: [...surface.uRange],
  vRange: [...surface.vRange]
});
const domainFor = surface => state.domains.get(domainKey(surface)) || defaultDomain(surface);
const normalizeParameters = (surface, values) => surface.normalizeParameters ? surface.normalizeParameters(values) : values;
const defaultParameters = surface => Object.fromEntries(
  Object.entries(surface.parameters || {}).map(([key, parameter]) => [key, parameter.value])
);
const parametersFor = surface => normalizeParameters(surface, state.parameters.get(domainKey(surface)) || defaultParameters(surface));
const withParameters = surface => surface.withParameters ? surface.withParameters(parametersFor(surface)) : surface;
const currentData = () => withDomain(withParameters(state.surface));
const domainTextFor = data => data.parameter
  ? `${formatNumber(data.uRange[0])} <= |z| <= ${formatNumber(data.uRange[1])}, ${formatNumber(data.vRange[0])} <= arg z <= ${formatNumber(data.vRange[1])}`
  : `${formatNumber(data.uRange[0])} <= Re z <= ${formatNumber(data.uRange[1])}, ${formatNumber(data.vRange[0])} <= Im z <= ${formatNumber(data.vRange[1])}`;
const withDomain = surface => {
  const domain = domainFor(surface);
  return {
    ...surface,
    uRange: [...domain.uRange],
    vRange: [...domain.vRange],
    domainText: domainTextFor({ ...surface, ...domain })
  };
};

const annulus = (r1, r2, uSegments = 60, vSegments = 181) => ({
  uRange: [r1, r2],
  vRange: [0, TAU],
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

const catenoid = () => surfaceWithFormulas({
  name: "Catenoid",
  ...annulus(0.3, 3, 70, 180),
  fText: "z => -2 / z^2",
  gText: "z => z"
});

const surfaces = [
  s41({ name: "S41_3_1 Twisted Catenoid", m: 3, n: 1, r1: 1.0, r2: 2.0 }),
  s41({ name: "S41_5_1 UFO             ", m: 5, n: 1, r1: 1.1, r2: 1.3 }),
  s41({ name: "S41_5_3 Trefoil         ", m: 5, n: 3, r1: 1.0, r2: 1.5 }),
  s41({ name: "S41_5_3 Double Trefoil  ", m: 5, n: 3, r1: 1.1, r2: 1.5 }),
  s41({ name: "S41_7_1                 ", m: 7, n: 1, r1: 1.1, r2: 1.2 }),
  s41({ name: "S41_7_3                 ", m: 7, n: 3, r1: 1.1, r2: 1.2 }),
  s41({ name: "S41_7_5                 ", m: 7, n: 5, r1: 1.1, r2: 1.3 }),
  cobra({ name: "Cobra", m: 5, r1: 1, r2: 1.2 }),
  catenoid()
];

const canvas = document.querySelector("#surface");
const app = document.querySelector(".app");
const panelResizer = document.querySelector("#panel-resizer");
const resetButton = document.querySelector("#reset-view");
const surfaceName = document.querySelector("#surface-name");
const formulaF = document.querySelector("#formula-f");
const formulaG = document.querySelector("#formula-g");
const domainInfo = document.querySelector("#domain-info");
const surfaceButtons = document.querySelector("#surface-buttons");
const surfaceParameters = document.querySelector("#surface-parameters");
const surfaceParameterControls = document.querySelector("#surface-parameter-controls");
const resetDomainButton = document.querySelector("#reset-domain");
const domainControls = {
  uMin: document.querySelector("#u-min"),
  uMax: document.querySelector("#u-max"),
  vMin: document.querySelector("#v-min"),
  vMax: document.querySelector("#v-max")
};
const domainOutputs = {
  uMin: document.querySelector("#u-min-value"),
  uMax: document.querySelector("#u-max-value"),
  vMin: document.querySelector("#v-min-value"),
  vMax: document.querySelector("#v-max-value")
};
const domainLabels = {
  uMin: document.querySelector("#u-min-label"),
  uMax: document.querySelector("#u-max-label"),
  vMin: document.querySelector("#v-min-label"),
  vMax: document.querySelector("#v-max-label")
};
const state = {
  surface: null,
  domains: new Map(),
  parameters: new Map(),
  sliderFrame: 0
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
const surfaceGroup = new THREE.Group();

const material = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  vertexColors: true,
  metalness: 0,
  roughness: 0.46,
  clearcoat: 0.42,
  clearcoatRoughness: 0.38,
  side: THREE.DoubleSide,
  transparent: false,
  opacity: 1
});
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x172433,
  transparent: true,
  opacity: 0.11
});

controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.4;
controls.maxDistance = 8;
controls.enablePan = false;

scene.add(surfaceGroup);
scene.add(new THREE.HemisphereLight(0xf5fbff, 0x6b8794, 1.05));
scene.add(((light) => { light.position.set(-2.6, -3.2, 4.4); return light; })(new THREE.DirectionalLight(0xffffff, 2.05)));
scene.add(((light) => { light.position.set(3.2, 2.1, 2.5); return light; })(new THREE.DirectionalLight(0x9ee9ff, 0.8)));
scene.add(((light) => { light.position.set(0.4, -1.2, 3.8); return light; })(new THREE.DirectionalLight(0xfff0c8, 0.9)));

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

const surfacePalette = [0x009e9a, 0x0068ff, 0x7132ff, 0xe03aad, 0xff9d00].map(color => new THREE.Color(color));
const paletteColor = value => {
  const scaled = THREE.MathUtils.clamp(value, 0, 1) * (surfacePalette.length - 1);
  const index = Math.min(surfacePalette.length - 2, Math.floor(scaled));
  return surfacePalette[index].clone().lerp(surfacePalette[index + 1], scaled - index);
};

const colorForPoint = point => {
  const height = THREE.MathUtils.clamp((point[2] + 1) / 2, 0, 1);
  const radial = THREE.MathUtils.clamp(Math.hypot(point[0], point[1]), 0, 1);
  const angle = (Math.atan2(point[1], point[0]) + TAU) / TAU;
  const fold = (Math.sin(angle * TAU * 2 + point[2] * 3) + 1) / 2;
  const value = 0.56 * height + 0.3 * radial + 0.14 * fold;
  return paletteColor(value);
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

const renderSurface = data => {
  const geometries = surfaceGeometry(data);
  disposeSurface();
  surfaceGroup.add(new THREE.Mesh(geometries.geometry, material));
  surfaceGroup.add(new THREE.LineSegments(geometries.lineGeometry, lineMaterial));
};

const updateDomainInfo = data => {
  surfaceName.textContent = data.name;
  formulaF.textContent = data.fText;
  formulaG.textContent = data.gText;
  domainInfo.textContent = data.domainText;
  [...surfaceButtons.children].forEach(button => button.classList.toggle("active", button.dataset.surface === data.name));
};

const setSurface = surface => {
  state.surface = surface;
  const data = currentData();
  renderSurface(data);
  updateDomainInfo(data);
  syncDomainControls(data);
  syncParameterControls(surface);
};

const configureSlider = (control, bounds, value, step = 0.01) => {
  control.min = formatNumber(bounds[0]);
  control.max = formatNumber(bounds[1]);
  control.step = step;
  control.value = formatNumber(value);
};

const syncDomainOutputs = domain => {
  domainOutputs.uMin.value = formatNumber(domain.uRange[0]);
  domainOutputs.uMax.value = formatNumber(domain.uRange[1]);
  domainOutputs.vMin.value = formatNumber(domain.vRange[0]);
  domainOutputs.vMax.value = formatNumber(domain.vRange[1]);
};

const syncDomainControls = surface => {
  const domain = domainFor(surface);
  const uBounds = surface.parameter
    ? [Math.max(0.01, sliderBounds(surface.uRange)[0]), sliderBounds(surface.uRange)[1]]
    : sliderBounds(surface.uRange);
  const vBounds = surface.parameter ? [0, TAU * 2] : sliderBounds(surface.vRange);
  domainLabels.uMin.textContent = surface.parameter ? "r min" : "u min";
  domainLabels.uMax.textContent = surface.parameter ? "r max" : "u max";
  domainLabels.vMin.textContent = surface.parameter ? "w min" : "v min";
  domainLabels.vMax.textContent = surface.parameter ? "w max" : "v max";
  configureSlider(domainControls.uMin, uBounds, domain.uRange[0]);
  configureSlider(domainControls.uMax, uBounds, domain.uRange[1]);
  configureSlider(domainControls.vMin, vBounds, domain.vRange[0]);
  configureSlider(domainControls.vMax, vBounds, domain.vRange[1]);
  syncDomainOutputs(domain);
};

const parameterText = (parameter, value) => parameter.format ? parameter.format(value) : formatNumber(value);

const createParameterControl = ([key, parameter], values) => {
  const label = document.createElement("label");
  const title = document.createElement("span");
  const input = document.createElement("input");
  const output = document.createElement("output");
  input.type = "range";
  input.min = parameter.min;
  input.max = parameter.max;
  input.step = parameter.step || 1;
  input.value = values[key];
  input.dataset.parameter = key;
  title.textContent = parameter.label || key;
  output.value = parameterText(parameter, values[key]);
  label.append(title, input, output);
  return label;
};

const syncParameterControls = surface => {
  const entries = Object.entries(surface.parameters || {});
  const values = parametersFor(surface);
  surfaceParameters.hidden = entries.length === 0;
  surfaceParameterControls.replaceChildren(...entries.map(entry => createParameterControl(entry, values)));
  [...surfaceParameterControls.querySelectorAll("input")].forEach(control => control.addEventListener("input", updateCurrentParameters));
};

const sortedRange = (min, max) => {
  const values = [Number(min), Number(max)].sort((a, b) => a - b);
  return values[0] === values[1] ? [values[0], values[1] + 0.01] : values;
};

const updateCurrentDomain = () => {
  if (!state.surface) return;
  const domain = {
    uRange: sortedRange(domainControls.uMin.value, domainControls.uMax.value),
    vRange: sortedRange(domainControls.vMin.value, domainControls.vMax.value)
  };
  state.domains.set(domainKey(state.surface), domain);
  syncDomainOutputs(domain);
  cancelAnimationFrame(state.sliderFrame);
  state.sliderFrame = requestAnimationFrame(() => {
    const data = currentData();
    renderSurface(data);
    updateDomainInfo(data);
  });
};

const updateCurrentParameters = () => {
  if (!state.surface) return;
  const values = normalizeParameters(state.surface, Object.fromEntries(
    [...surfaceParameterControls.querySelectorAll("input")].map(control => [control.dataset.parameter, Number(control.value)])
  ));
  const parameters = state.surface.parameters || {};
  state.parameters.set(domainKey(state.surface), values);
  [...surfaceParameterControls.querySelectorAll("input")].forEach(control => {
    const value = values[control.dataset.parameter];
    control.value = value;
    control.nextElementSibling.value = parameterText(parameters[control.dataset.parameter], value);
  });
  const data = currentData();
  renderSurface(data);
  updateDomainInfo(data);
  syncDomainControls(data);
};

const resetDomain = () => {
  if (!state.surface) return;
  state.domains.delete(domainKey(state.surface));
  const data = currentData();
  syncDomainControls(data);
  renderSurface(data);
  updateDomainInfo(data);
};

const setPanelWidth = width => {
  const maxWidth = Math.max(320, window.innerWidth - 360);
  const nextWidth = clamp(300, width, maxWidth);
  app.style.setProperty("--panel-width", `${Math.round(nextWidth)}px`);
  localStorage.setItem("minimalSurfacePanelWidth", Math.round(nextWidth).toString());
  resize();
};

const initPanelWidth = () => {
  const storedWidth = Number(localStorage.getItem("minimalSurfacePanelWidth"));
  if (Number.isFinite(storedWidth) && storedWidth > 0) setPanelWidth(storedWidth);
};

const startPanelResize = event => {
  panelResizer.setPointerCapture(event.pointerId);
  document.body.classList.add("resizing-panel");
};

const movePanelResize = event => {
  if (!document.body.classList.contains("resizing-panel")) return;
  setPanelWidth(window.innerWidth - event.clientX);
};

const stopPanelResize = event => {
  if (panelResizer.hasPointerCapture(event.pointerId)) panelResizer.releasePointerCapture(event.pointerId);
  document.body.classList.remove("resizing-panel");
};

const resizePanelWithKeyboard = event => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const currentWidth = panelResizer.getBoundingClientRect().right
    ? document.querySelector(".panel").getBoundingClientRect().width
    : 410;
  setPanelWidth(currentWidth + (event.key === "ArrowLeft" ? 24 : -24));
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
resetDomainButton.addEventListener("click", resetDomain);
Object.values(domainControls).forEach(control => control.addEventListener("input", updateCurrentDomain));
panelResizer.addEventListener("pointerdown", startPanelResize);
panelResizer.addEventListener("pointermove", movePanelResize);
panelResizer.addEventListener("pointerup", stopPanelResize);
panelResizer.addEventListener("pointercancel", stopPanelResize);
panelResizer.addEventListener("keydown", resizePanelWithKeyboard);
window.addEventListener("resize", resize);

initPanelWidth();
resetView();
setSurface(surfaces[0]);
resize();
animate();
