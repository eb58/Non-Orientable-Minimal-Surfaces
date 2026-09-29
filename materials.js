export const MATERIAL_MODES = ["copper", "gold", "color", "marble", "email"];

export const MATERIAL_MODE_LABELS = {
  copper: "Kupfer",
  color: "Farbverlauf",
  marble: "Marmor",
  gold: "Gold",
  email: "Emaille"
};

export const adjacentMaterialMode = (mode, offset) => {
  const index = MATERIAL_MODES.indexOf(mode);
  return MATERIAL_MODES[(index + offset + MATERIAL_MODES.length) % MATERIAL_MODES.length];
};

export const usesSurfaceLines = mode => mode === "color";
