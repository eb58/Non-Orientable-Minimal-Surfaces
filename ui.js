import { TAU, clamp } from "./math.js";
import { MATERIAL_MODE_LABELS, adjacentMaterialMode } from "./materials.js";
import { BACKGROUNDS } from "./backgrounds.js";

const formatNumber = value => Number(value).toFixed(2);
const formatDomainNumber = value => Number(value).toFixed(3);
const backgroundAt = (background, offset = 0) => {
  const index = Math.max(0, BACKGROUNDS.findIndex(({ id }) => id === background));
  return BACKGROUNDS[(index + offset + BACKGROUNDS.length) % BACKGROUNDS.length];
};
const sliderBounds = rangeValues => {
  const span = rangeValues[1] - rangeValues[0];
  const padding = Math.max(0.25, Math.abs(span) * 0.8);
  return [rangeValues[0] - padding, rangeValues[1] + padding];
};

export const createUI = ({
  surfaces,
  getObjectPosition,
  onSurfaceChange,
  onResetView,
  onSaveImage,
  onResetDomain,
  onResetParameters,
  onResetObjectPosition,
  onMaterialStep,
  onDomainChange,
  onParametersChange,
  onObjectPositionChange,
  onHammerFactorChange,
  onBackgroundChange,
  onSurfaceStep,
  onPanelResize
}) => {
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
  const resetParametersButton = document.querySelector("#reset-parameters");
  const materialPrevious = document.querySelector("#material-previous");
  const materialNext = document.querySelector("#material-next");
  const materialModeControl = document.querySelector(".material-mode-control");
  const materialModeLabel = document.querySelector("#material-mode-label");
  const hammerFactorRow = document.querySelector("#hammer-factor-row");
  const hammerFactorControl = document.querySelector("#hammer-factor");
  const hammerFactorOutput = document.querySelector("#hammer-factor-value");
  const backgroundPrevious = document.querySelector("#background-previous");
  const backgroundNext = document.querySelector("#background-next");
  const backgroundModeControl = document.querySelector(".background-mode-control");
  const backgroundModeLabel = document.querySelector("#background-mode-label");
  const viewerMaterialCycle = document.querySelector("#material-cycle");
  const viewerBackgroundCycle = document.querySelector("#background-cycle");
  const viewerSurfaceCycle = document.querySelector("#surface-cycle");
  const viewer = document.querySelector(".viewer");
  const resetDomainButton = document.querySelector("#reset-domain");
  const saveImageButton = document.querySelector("#save-image");
  const domainControls = {
    uMin: document.querySelector("#u-min"),
    uMax: document.querySelector("#u-max"),
    vMax: document.querySelector("#v-max")
  };
  const domainOutputs = {
    uMin: document.querySelector("#u-min-value"),
    uMax: document.querySelector("#u-max-value"),
    vMax: document.querySelector("#v-max-value")
  };
  const domainLabels = {
    uMin: document.querySelector("#u-min-label"),
    uMax: document.querySelector("#u-max-label"),
    vMax: document.querySelector("#v-max-label")
  };
  const objectAxes = ["x", "y", "z"];
  const objectControls = Object.fromEntries(objectAxes.map(axis => [axis, document.querySelector(`#object-${axis}`)]));
  const objectOutputs = Object.fromEntries(objectAxes.map(axis => [axis, document.querySelector(`#object-${axis}-value`)]));

  const configureSlider = (control, bounds, value, step = 0.01) => {
    control.min = formatDomainNumber(bounds[0]);
    control.max = formatDomainNumber(bounds[1]);
    control.step = step;
    control.value = formatDomainNumber(value);
  };
  const syncDomainOutputs = domain => {
    domainOutputs.uMin.value = formatDomainNumber(domain.uRange[0]);
    domainOutputs.uMax.value = formatDomainNumber(domain.uRange[1]);
    domainOutputs.vMax.value = formatDomainNumber(domain.vRange[1]);
  };
  const syncDomainControls = (surface, domain) => {
    const uBounds = surface.parameter
      ? [Math.max(0.01, sliderBounds(surface.uRange)[0]), sliderBounds(surface.uRange)[1]]
      : sliderBounds(surface.uRange);
    const vBounds = surface.parameter
      ? [surface.vRange[0] + 0.01, surface.vRange[1]]
      : [surface.vRange[0] + 0.01, sliderBounds(surface.vRange)[1]];
    domainLabels.uMin.textContent = surface.parameter ? "r min" : "u min";
    domainLabels.uMax.textContent = surface.parameter ? "r max" : "u max";
    domainLabels.vMax.textContent = surface.parameter ? "w max" : "v max";
    configureSlider(domainControls.uMin, uBounds, domain.uRange[0]);
    configureSlider(domainControls.uMax, uBounds, domain.uRange[1]);
    configureSlider(domainControls.vMax, vBounds, domain.vRange[1]);
    syncDomainOutputs(domain);
  };

  const parameterText = (parameter, value) => parameter.format ? parameter.format(value) : formatNumber(value);
  const readParameterControls = () => Object.fromEntries(
    [...surfaceParameterControls.querySelectorAll("input[data-parameter]")]
      .map(control => [control.dataset.parameter, Number(control.value)])
  );
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
  const syncParameterControls = (surface, values) => {
    const entries = Object.entries(surface.parameters || {});
    surfaceParameters.hidden = false;
    resetParametersButton.hidden = entries.length === 0;
    surfaceParameterControls.replaceChildren(
      ...entries.map(entry => createParameterControl(entry, values)),
      hammerFactorRow
    );
    [...surfaceParameterControls.querySelectorAll("input[data-parameter]")].forEach(control =>
      control.addEventListener("input", () => onParametersChange(readParameterControls()))
    );
  };
  const syncParameterValues = (surface, values) => {
    Object.entries(values).forEach(([key, value]) => {
      const control = surfaceParameterControls.querySelector(`[data-parameter="${key}"]`);
      if (!control) return;
      control.value = value;
      control.nextElementSibling.value = parameterText(surface.parameters[key], value);
    });
  };

  const updateDomainInfo = data => {
    surfaceName.textContent = data.name;
    formulaF.textContent = data.fText;
    formulaG.textContent = data.gText;
    domainInfo.textContent = data.domainText;
    [...surfaceButtons.children].forEach(button => button.classList.toggle("active", button.dataset.surface === data.name));
  };
  const syncObjectOutputs = position => objectAxes.forEach(axis => {
    if (!objectOutputs[axis]) return;
    objectOutputs[axis].value = formatNumber(position[axis]);
  });
  const syncObjectControls = (surface, position = getObjectPosition(surface)) => {
    objectAxes.forEach(axis => {
      if (!objectControls[axis]) return;
      objectControls[axis].value = formatNumber(position[axis]);
    });
    syncObjectOutputs(position);
  };
  const syncObjectPosition = position => {
    objectAxes.forEach(axis => {
      if (!objectControls[axis]) return;
      objectControls[axis].value = formatNumber(position[axis]);
    });
    syncObjectOutputs(position);
  };
  const syncMaterialSelector = mode => {
    const previousLabel = MATERIAL_MODE_LABELS[adjacentMaterialMode(mode, -1)];
    const nextLabel = MATERIAL_MODE_LABELS[adjacentMaterialMode(mode, 1)];
    materialModeLabel.textContent = MATERIAL_MODE_LABELS[mode];
    materialModeControl.dataset.mode = mode;
    materialPrevious.title = `Zurück zu ${previousLabel}`;
    materialPrevious.setAttribute("aria-label", `Vorheriger Darstellungsmodus: ${previousLabel}`);
    materialNext.title = `Weiter zu ${nextLabel}`;
    materialNext.setAttribute("aria-label", `Nächster Darstellungsmodus: ${nextLabel}`);
    hammerFactorRow.hidden = false;
  };
  const syncHammerFactor = factor => {
    hammerFactorControl.value = formatNumber(factor);
    hammerFactorOutput.value = formatNumber(factor);
  };
  const updateCurrentHammerFactor = () => onHammerFactorChange(Number(hammerFactorControl.value));
  const syncBackground = background => {
    const current = backgroundAt(background);
    const previous = backgroundAt(background, -1);
    const next = backgroundAt(background, 1);
    backgroundModeLabel.textContent = current.label;
    backgroundModeControl.dataset.background = current.id;
    backgroundPrevious.title = `Zurück zu ${previous.label}`;
    backgroundPrevious.setAttribute("aria-label", `Vorheriger Hintergrund: ${previous.label}`);
    backgroundNext.title = `Weiter zu ${next.label}`;
    backgroundNext.setAttribute("aria-label", `Nächster Hintergrund: ${next.label}`);
    viewer.dataset.background = current.id;
  };

  const updateCurrentDomain = () => onDomainChange({
    uMin: domainControls.uMin.value,
    uMax: domainControls.uMax.value,
    vMax: domainControls.vMax.value
  });
  const updateCurrentObjectPosition = () => onObjectPositionChange(
    Object.fromEntries(objectAxes.map(axis => [axis, Number(objectControls[axis].value)]))
  );

  const setPanelWidth = width => {
    const maxWidth = Math.max(320, window.innerWidth - 360);
    const nextWidth = clamp(300, width, maxWidth);
    app.style.setProperty("--panel-width", `${Math.round(nextWidth)}px`);
    localStorage.setItem("minimalSurfacePanelWidth", Math.round(nextWidth).toString());
    onPanelResize();
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
    if (document.body.classList.contains("resizing-panel")) setPanelWidth(window.innerWidth - event.clientX);
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

  const panelToggle = document.getElementById("panel-toggle");
  const isMobile = () => globalThis.matchMedia("(max-width: 820px)").matches;
  const updatePanelToggle = () => {
    const collapsed = app.classList.contains("panel-collapsed");
    panelToggle.textContent = isMobile() ? (collapsed ? "\u2227" : "\u2228") : (collapsed ? "\u2039" : "\u203a");
    panelToggle.setAttribute("aria-expanded", String(!collapsed));
  };
  const createSurfaceButton = data => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "surface-option";
    button.dataset.surface = data.name;
    button.textContent = data.name;
    button.addEventListener("click", () => onSurfaceChange(data));
    return button;
  };

  surfaceButtons.append(...surfaces.map(createSurfaceButton));
  resetButton.addEventListener("click", onResetView);
  saveImageButton.addEventListener("click", onSaveImage);
  resetDomainButton.addEventListener("click", onResetDomain);
  resetParametersButton.addEventListener("click", onResetParameters);
  materialPrevious.addEventListener("click", () => onMaterialStep(-1));
  materialNext.addEventListener("click", () => onMaterialStep(1));
  Object.values(domainControls).forEach(control => control.addEventListener("input", updateCurrentDomain));
  Object.values(objectControls).filter(Boolean).forEach(control => control.addEventListener("input", updateCurrentObjectPosition));
  hammerFactorControl.addEventListener("input", updateCurrentHammerFactor);
  backgroundPrevious.addEventListener("click", () => onBackgroundChange(
    backgroundAt(backgroundModeControl.dataset.background, -1).id
  ));
  backgroundNext.addEventListener("click", () => onBackgroundChange(
    backgroundAt(backgroundModeControl.dataset.background, 1).id
  ));
  viewerBackgroundCycle.addEventListener("click", () => onBackgroundChange(
    backgroundAt(backgroundModeControl.dataset.background, 1).id
  ));
  viewerSurfaceCycle.addEventListener("click", () => onSurfaceStep(1));
  viewerMaterialCycle.addEventListener("click", () => onMaterialStep(1));
  panelResizer.addEventListener("pointerdown", startPanelResize);
  panelResizer.addEventListener("pointermove", movePanelResize);
  panelResizer.addEventListener("pointerup", stopPanelResize);
  panelResizer.addEventListener("pointercancel", stopPanelResize);
  panelResizer.addEventListener("keydown", resizePanelWithKeyboard);
  if (isMobile()) app.classList.add("panel-collapsed");
  updatePanelToggle();
  panelToggle.addEventListener("click", () => {
    app.classList.toggle("panel-collapsed");
    updatePanelToggle();
  });
  window.addEventListener("resize", updatePanelToggle);
  initPanelWidth();

  return {
    syncDomainControls,
    syncDomainOutputs,
    syncParameterControls,
    syncParameterValues,
    updateDomainInfo,
    syncObjectControls,
    syncObjectPosition,
    syncMaterialSelector,
    syncHammerFactor,
    syncBackground
  };
};
