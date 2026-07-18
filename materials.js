export const MATERIAL_MODES = ["copper", "bronze", "gold", "color", "mirror", "marble", "glass", "irid", "neon", "email"];

export const MATERIAL_MODE_LABELS = {
  copper: "Kupfer",
  color: "Farbverlauf",
  mirror: "Spiegel",
  marble: "Marmor",
  glass: "Glas",
  irid: "Seifenblase",
  neon: "Neon",
  bronze: "Bronze",
  gold: "Gold",
  email: "Emaille"
};

export const adjacentMaterialMode = (mode, offset) => {
  const index = MATERIAL_MODES.indexOf(mode);
  return MATERIAL_MODES[(index + offset + MATERIAL_MODES.length) % MATERIAL_MODES.length];
};
