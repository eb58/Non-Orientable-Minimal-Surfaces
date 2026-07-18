export const BACKGROUNDS = [
  { id: "space", label: "Weltraum" },
  { id: "park", label: "Parklandschaft" },
  { id: "mountains", label: "Gebirgslandschaft" },
  { id: "aurora", label: "Polarlicht" },
  { id: "underwater", label: "Unterwasserwelt" },
  { id: "theater", label: "Theaterbühne" }
];

export const BACKGROUND_IDS = BACKGROUNDS.map(({ id }) => id);

export const adjacentBackground = (background, offset) => {
  const index = Math.max(0, BACKGROUND_IDS.indexOf(background));
  return BACKGROUND_IDS[(index + offset + BACKGROUND_IDS.length) % BACKGROUND_IDS.length];
};
