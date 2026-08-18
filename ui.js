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
  onRotationToggle,
  onRecordVideoToggle,
  onViewNudge,
  onPanelResize
}) => {
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
  const rotationToggle = document.querySelector("#rotation-toggle");
  const viewerMaterialCycle = document.querySelector("#material-cycle");
  const viewerBackgroundCycle = document.querySelector("#background-cycle");
  const viewerSurfaceCycle = document.querySelector("#surface-cycle");
  const viewer = document.querySelector(".viewer");
  const canvas = document.querySelector("#surface");
  const panel = document.querySelector(".panel");
  const resetDomainButton = document.querySelector("#reset-domain");
  const saveImageButton = document.querySelector("#save-image");
  const recordVideoButton = document.querySelector("#record-video");
  const videoResolutionControl = document.querySelector("#video-resolution");
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

  const syncRotation = enabled => {
    rotationToggle.setAttribute("aria-pressed", String(enabled));
    const label = enabled ? "Automatische Drehung stoppen" : "Automatische Drehung starten";
    rotationToggle.title = label;
    rotationToggle.setAttribute("aria-label", label);
  };

  const syncRecording = recording => {
    recordVideoButton.setAttribute("aria-pressed", String(recording));
    recordVideoButton.textContent = recording ? "Aufnahme beenden" : "Video aufnehmen";
    videoResolutionControl.disabled = recording;
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
  const tvMode = new URLSearchParams(location.search).has("tv") || /\bAFT[A-Z0-9]+\b/i.test(navigator.userAgent);
  document.documentElement.classList.toggle("tv", tvMode);
  const isMobile = () => globalThis.matchMedia("(max-width: 820px)").matches;
  const updatePanelToggle = () => {
    const collapsed = app.classList.contains("panel-collapsed");
    panelToggle.textContent = isMobile() ? (collapsed ? "\u2227" : "\u2228") : (collapsed ? "\u2039" : "\u203a");
    panelToggle.setAttribute("aria-expanded", String(!collapsed));
    panel.toggleAttribute("inert", collapsed);
    panel.setAttribute("aria-hidden", String(collapsed));
  };
  const setPanelCollapsed = collapsed => {
    app.classList.toggle("panel-collapsed", collapsed);
    updatePanelToggle();
  };
  const openTvPanel = () => {
    setPanelCollapsed(false);
    requestAnimationFrame(() => (surfaceButtons.querySelector(".active") || surfaceButtons.firstElementChild)?.focus());
  };
  const tvFocusableElements = () => [...document.querySelectorAll(
    "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])"
  )].filter(element => !element.closest("[inert]") && element.getClientRects().length);
  const stepTvFocus = offset => {
    const elements = tvFocusableElements();
    if (!elements.length) return false;
    const currentIndex = elements.indexOf(document.activeElement);
    const nextIndex = currentIndex < 0
      ? (offset < 0 ? elements.length - 1 : 0)
      : (currentIndex + offset + elements.length) % elements.length;
    elements[nextIndex].focus();
    return true;
  };
  const activateTvFocus = () => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === canvas) return false;
    if (active instanceof HTMLSelectElement && typeof active.showPicker === "function") active.showPicker();
    else active.click();
    return true;
  };
  const handleTvDirection = key => {
    const viewSteps = {
      directionLeft: { horizontal: -0.11 },
      directionRight: { horizontal: 0.11 },
      directionUp: { vertical: 0.09 },
      directionDown: { vertical: -0.09 }
    };
    if (document.activeElement === canvas) {
      onViewNudge(viewSteps[key]);
      return true;
    }
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && active.type === "range" && ["directionLeft", "directionRight"].includes(key)) {
      key === "directionLeft" ? active.stepDown() : active.stepUp();
      active.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    return stepTvFocus(["directionLeft", "directionUp"].includes(key) ? -1 : 1);
  };
  const handleTvCanvasKey = event => {
    if (!tvMode || document.activeElement !== canvas) return false;
    const viewSteps = {
      ArrowLeft: { horizontal: -0.11 },
      ArrowRight: { horizontal: 0.11 },
      ArrowUp: { vertical: 0.09 },
      ArrowDown: { vertical: -0.09 }
    };
    if (!viewSteps[event.key]) return false;
    onViewNudge(viewSteps[event.key]);
    event.preventDefault();
    return true;
  };
  const handleNativeTvKey = key => {
    if (!tvMode) return false;
    if (key === "menu") {
      app.classList.contains("panel-collapsed") ? openTvPanel() : setPanelCollapsed(true);
      if (app.classList.contains("panel-collapsed")) canvas.focus();
      return true;
    }
    if (key === "back" && !app.classList.contains("panel-collapsed")) {
      setPanelCollapsed(true);
      canvas.focus();
      return true;
    }
    if (key === "playPause") {
      onRotationToggle();
      return true;
    }
    if (["directionLeft", "directionRight", "directionUp", "directionDown"].includes(key)) return handleTvDirection(key);
    if (["focusPrevious", "focusNext"].includes(key)) return stepTvFocus(key === "focusPrevious" ? -1 : 1);
    if (key === "select") return activateTvFocus();
    if (["materialPrevious", "materialNext"].includes(key)) {
      onMaterialStep(key === "materialPrevious" ? -1 : 1);
      return true;
    }
    if (["backgroundPrevious", "backgroundNext"].includes(key)) {
      onBackgroundChange(backgroundAt(
        backgroundModeControl.dataset.background,
        key === "backgroundPrevious" ? -1 : 1
      ).id);
      return true;
    }
    if (["rewind", "fastForward"].includes(key)) {
      onViewNudge({ zoom: key === "rewind" ? 0.14 : -0.14 });
      return true;
    }
    return false;
  };
  const handleTvKeyboardKey = event => {
    if (!tvMode) return;
    if (event.key === "Tab") {
      event.preventDefault();
      stepTvFocus(event.shiftKey ? -1 : 1);
      return;
    }
    if (!["Enter", " "].includes(event.key) || document.activeElement === canvas) return;
    event.preventDefault();
    activateTvFocus();
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
  recordVideoButton.addEventListener("click", () => onRecordVideoToggle(videoResolutionControl.value));
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
  rotationToggle.addEventListener("click", onRotationToggle);
  viewerMaterialCycle.addEventListener("click", () => onMaterialStep(1));
  panelResizer.addEventListener("pointerdown", startPanelResize);
  panelResizer.addEventListener("pointermove", movePanelResize);
  panelResizer.addEventListener("pointerup", stopPanelResize);
  panelResizer.addEventListener("pointercancel", stopPanelResize);
  panelResizer.addEventListener("keydown", resizePanelWithKeyboard);
  if (isMobile() || tvMode) app.classList.add("panel-collapsed");
  updatePanelToggle();
  panelToggle.addEventListener("click", () => {
    setPanelCollapsed(!app.classList.contains("panel-collapsed"));
  });
  canvas.addEventListener("keydown", handleTvCanvasKey);
  document.addEventListener("keydown", handleTvKeyboardKey, { capture: true });
  window.fireTvHandleKey = handleNativeTvKey;
  window.addEventListener("resize", updatePanelToggle);
  initPanelWidth();
  if (tvMode) requestAnimationFrame(() => canvas.focus());

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
    syncBackground,
    syncRotation,
    syncRecording
  };
};
