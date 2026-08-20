export const AUTO_ROTATION_TURNS = 2;
export const ROTATION_SPEED = { min: 0.25, max: 3, step: 0.05, default: 1, base: 5 };
export const normalizeRotationSpeed = value => Math.min(
  ROTATION_SPEED.max,
  Math.max(ROTATION_SPEED.min, Number(value) || ROTATION_SPEED.default)
);

export const nextPresentationIndices = ({
  surfaceIndex,
  surfaceCount,
  backgroundIndex,
  backgroundCount,
  materialIndex,
  materialCount
}) => {
  const completesSurfaceLoop = surfaceIndex === surfaceCount - 1;
  return {
    surfaceIndex: surfaceIndex < 0 ? 0 : (surfaceIndex + 1) % surfaceCount,
    backgroundIndex: completesSurfaceLoop ? (backgroundIndex + 1) % backgroundCount : backgroundIndex,
    materialIndex: completesSurfaceLoop ? (materialIndex + 1) % materialCount : materialIndex,
    themeChanged: completesSurfaceLoop
  };
};
