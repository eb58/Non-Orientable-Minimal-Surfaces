import { surfaces } from "./math.js";
import { createRenderer } from "./renderer.js";
import { createUI } from "./ui.js";
import { MATERIAL_MODES, adjacentMaterialMode } from "./materials.js";
import { BACKGROUND_IDS } from "./backgrounds.js";

const STORAGE_KEY = "minimalSurfaceStateV1";
const domainKey = surface => surface.name;
const formatNumber = value => Number(value).toFixed(3);
const defaultDomain = surface => ({
  uRange: [...surface.uRange],
  vRange: [...surface.vRange]
});
const finiteNumberArray = (value, length) => Array.isArray(value)
  && value.length === length
  && value.every(Number.isFinite);
const validDomain = value => finiteNumberArray(value?.uRange, 2) && finiteNumberArray(value?.vRange, 2);
const validParameters = value => value && typeof value === "object" && Object.values(value).every(Number.isFinite);
const validObjectPosition = value => ["x", "y", "z"].every(axis => Number.isFinite(value?.[axis]));
const validSurfaceView = value => finiteNumberArray(value?.camera, 3) && finiteNumberArray(value?.target, 3);
const validHammerFactor = value => Number.isFinite(value) && value >= 0 && value <= 2;
const readStorageState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};
const mapFromStorage = (value, validValue) => new Map(
  Object.entries(value || {}).filter(([key, item]) => surfaces.some(surface => domainKey(surface) === key) && validValue(item))
);
const storageState = readStorageState();
const storedHammerFactors = mapFromStorage(storageState.hammerFactors, validHammerFactor);
if (!storedHammerFactors.size
  && validHammerFactor(storageState.hammerFactor)
  && surfaces.some(surface => domainKey(surface) === storageState.activeSurface)) {
  storedHammerFactors.set(storageState.activeSurface, storageState.hammerFactor);
}
const state = {
  surface: null,
  domains: mapFromStorage(storageState.domains, validDomain),
  parameters: mapFromStorage(storageState.parameters, validParameters),
  objectPositions: mapFromStorage(storageState.objectPositions, validObjectPosition),
  surfaceViews: mapFromStorage(storageState.surfaceViews, validSurfaceView),
  hammerFactors: storedHammerFactors,
  materialMode: MATERIAL_MODES.includes(storageState.materialMode) ? storageState.materialMode : "copper",
  background: BACKGROUND_IDS.includes(storageState.background) ? storageState.background : "space",
  persistenceFrame: 0,
  sliderFrame: 0
};
const services = { renderer: null, ui: null };

const domainFor = surface => {
  const domain = state.domains.get(domainKey(surface)) || defaultDomain(surface);
  return {
    uRange: [...domain.uRange],
    vRange: [domain.vRange[0], Math.min(domain.vRange[1], surface.vRange[1])]
  };
};
const normalizeParameters = (surface, values) => surface.normalizeParameters ? surface.normalizeParameters(values) : values;
const defaultParameters = surface => Object.fromEntries(
  Object.entries(surface.parameters || {}).map(([key, parameter]) => [key, parameter.value])
);
const parametersFor = surface => normalizeParameters(surface, state.parameters.get(domainKey(surface)) || defaultParameters(surface));
const defaultObjectPosition = () => ({ x: 0, y: 0, z: 0.30 });
const objectPositionFor = surface => state.objectPositions.get(domainKey(surface)) || defaultObjectPosition();
const hammerFactorFor = surface => state.hammerFactors.get(domainKey(surface)) ?? 1;
const withParameters = surface => surface.withParameters ? surface.withParameters(parametersFor(surface)) : surface;
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
const currentData = () => withDomain(withParameters(state.surface));

const saveAppState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({
  activeSurface: state.surface ? domainKey(state.surface) : storageState.activeSurface,
  materialMode: state.materialMode,
  background: state.background,
  hammerFactors: Object.fromEntries(state.hammerFactors),
  domains: Object.fromEntries(state.domains),
  parameters: Object.fromEntries(state.parameters),
  objectPositions: Object.fromEntries(state.objectPositions),
  surfaceViews: Object.fromEntries(state.surfaceViews)
}));
const scheduleSaveAppState = () => {
  cancelAnimationFrame(state.persistenceFrame);
  state.persistenceFrame = requestAnimationFrame(saveAppState);
};

const saveCurrentView = () => {
  if (!state.surface) return;
  state.surfaceViews.set(domainKey(state.surface), services.renderer.currentView());
  scheduleSaveAppState();
};
const setObjectPosition = position => {
  if (!state.surface) return;
  state.objectPositions.set(domainKey(state.surface), position);
  services.ui.syncObjectPosition(position);
  services.renderer.setObjectPosition(position);
  scheduleSaveAppState();
};
const setSurface = surface => {
  state.surface = surface;
  const data = currentData();
  services.ui.syncHammerFactor(hammerFactorFor(surface));
  services.renderer.renderSurface(data);
  services.ui.updateDomainInfo(data);
  services.ui.syncDomainControls(surface, domainFor(surface));
  services.ui.syncParameterControls(surface, parametersFor(surface));
  services.ui.syncObjectControls(surface, objectPositionFor(surface));
  services.renderer.applyView(state.surfaceViews.get(domainKey(surface)) || services.renderer.defaultView());
  services.renderer.setObjectPosition(objectPositionFor(surface));
  scheduleSaveAppState();
};
const updateCurrentDomain = ({ uMin, uMax, vMax }) => {
  if (!state.surface) return;
  const currentDomain = domainFor(state.surface);
  const sortedRange = (min, max) => {
    const values = [Number(min), Number(max)].sort((a, b) => a - b);
    return values[0] === values[1] ? [values[0], values[1] + 0.01] : values;
  };
  const domain = {
    uRange: sortedRange(uMin, uMax),
    vRange: sortedRange(currentDomain.vRange[0], vMax)
  };
  state.domains.set(domainKey(state.surface), domain);
  services.ui.syncDomainOutputs(domain);
  scheduleSaveAppState();
  cancelAnimationFrame(state.sliderFrame);
  state.sliderFrame = requestAnimationFrame(() => {
    const data = currentData();
    services.renderer.renderSurface(data);
    services.ui.updateDomainInfo(data);
  });
};
const updateCurrentParameters = values => {
  if (!state.surface) return;
  const normalized = normalizeParameters(state.surface, values);
  state.parameters.set(domainKey(state.surface), normalized);
  if (state.surface.resetDomainOnParameterChange) state.domains.delete(domainKey(state.surface));
  scheduleSaveAppState();
  services.ui.syncParameterValues(state.surface, normalized);
  const parameterizedSurface = withParameters(state.surface);
  const data = withDomain(parameterizedSurface);
  services.renderer.renderSurface(data);
  services.ui.updateDomainInfo(data);
  services.ui.syncDomainControls(parameterizedSurface, domainFor(parameterizedSurface));
};
const resetDomain = () => {
  if (!state.surface) return;
  state.domains.delete(domainKey(state.surface));
  scheduleSaveAppState();
  const data = currentData();
  services.ui.syncDomainControls(state.surface, domainFor(state.surface));
  services.renderer.renderSurface(data);
  services.ui.updateDomainInfo(data);
};
const resetParameters = () => {
  if (!state.surface?.parameters) return;
  state.parameters.delete(domainKey(state.surface));
  if (state.surface.resetDomainOnParameterChange) state.domains.delete(domainKey(state.surface));
  const values = parametersFor(state.surface);
  const parameterizedSurface = withParameters(state.surface);
  const data = withDomain(parameterizedSurface);
  services.ui.syncParameterControls(state.surface, values);
  services.ui.syncDomainControls(parameterizedSurface, domainFor(parameterizedSurface));
  services.renderer.renderSurface(data);
  services.ui.updateDomainInfo(data);
  scheduleSaveAppState();
};
const resetObjectPosition = () => {
  if (!state.surface) return;
  state.objectPositions.delete(domainKey(state.surface));
  const position = objectPositionFor(state.surface);
  services.ui.syncObjectPosition(position);
  services.renderer.setObjectPosition(position);
  scheduleSaveAppState();
};
const stepSurface = offset => {
  if (!state.surface) return;
  const index = surfaces.findIndex(surface => domainKey(surface) === domainKey(state.surface));
  setSurface(surfaces[(index + offset + surfaces.length) % surfaces.length]);
};
const stepMaterialMode = offset => {
  state.materialMode = adjacentMaterialMode(state.materialMode, offset);
  services.ui.syncMaterialSelector(state.materialMode);
  scheduleSaveAppState();
  if (state.surface) services.renderer.renderSurface(currentData());
};
const updateHammerFactor = factor => {
  if (!state.surface || !validHammerFactor(factor)) return;
  state.hammerFactors.set(domainKey(state.surface), factor);
  services.ui.syncHammerFactor(factor);
  scheduleSaveAppState();
  if (state.surface) services.renderer.renderSurface(currentData());
};
const updateBackground = background => {
  if (!BACKGROUND_IDS.includes(background)) return;
  state.background = background;
  services.ui.syncBackground(background);
  scheduleSaveAppState();
};
const resetView = () => {
  const view = services.renderer.defaultView();
  services.renderer.applyView(view);
  if (!state.surface) return;
  state.surfaceViews.set(domainKey(state.surface), view);
  scheduleSaveAppState();
};
const saveImage = () => services.renderer.saveImage(state.surface ? domainKey(state.surface) : "flaeche");

services.renderer = createRenderer({
  canvas: document.querySelector("#surface"),
  hud: document.querySelector(".hud"),
  getMaterialMode: () => state.materialMode,
  getHammerFactor: () => state.surface ? hammerFactorFor(state.surface) : 1,
  getSurface: () => state.surface,
  getObjectPosition: objectPositionFor,
  onObjectPositionChange: setObjectPosition,
  onViewChange: saveCurrentView
});
services.ui = createUI({
  surfaces,
  getObjectPosition: objectPositionFor,
  onSurfaceChange: setSurface,
  onResetView: resetView,
  onSaveImage: saveImage,
  onResetDomain: resetDomain,
  onResetParameters: resetParameters,
  onResetObjectPosition: resetObjectPosition,
  onMaterialStep: stepMaterialMode,
  onDomainChange: updateCurrentDomain,
  onParametersChange: updateCurrentParameters,
  onObjectPositionChange: setObjectPosition,
  onHammerFactorChange: updateHammerFactor,
  onBackgroundChange: updateBackground,
  onSurfaceStep: stepSurface,
  onPanelResize: services.renderer.resize
});

services.ui.syncMaterialSelector(state.materialMode);
services.ui.syncBackground(state.background);
resetView();
setSurface(surfaces.find(surface => domainKey(surface) === storageState.activeSurface) || surfaces.find(surface => surface.name.startsWith("S41_7_5")));
services.renderer.resize();
services.renderer.animate();
