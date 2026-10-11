export const AUTO_ROTATION_TURNS = 2;
export const PRESENTATION_IDLE_DELAY_MS = 30_000;
export const ROTATION_SPEED = { min: 0.25, max: 3, step: 0.05, default: 1, base: 5 };
export const normalizeRotationSpeed = value => Math.min(
  ROTATION_SPEED.max,
  Math.max(ROTATION_SPEED.min, Number(value) || ROTATION_SPEED.default)
);

export const createInteractionPause = ({
  delay = PRESENTATION_IDLE_DELAY_MS,
  onPause,
  onResume,
  setTimer = setTimeout,
  clearTimer = clearTimeout
}) => {
  let playing = false;
  let paused = false;
  let resumeTimer = null;

  const cancelResume = () => {
    if (resumeTimer !== null) clearTimer(resumeTimer);
    resumeTimer = null;
  };
  const setPlaying = enabled => {
    playing = enabled;
    if (enabled) return;
    cancelResume();
    paused = false;
  };
  const noteActivity = () => {
    if (!playing) return;
    if (!paused) {
      paused = true;
      onPause();
    }
    cancelResume();
    resumeTimer = setTimer(() => {
      resumeTimer = null;
      if (!playing) return;
      paused = false;
      onResume();
    }, delay);
  };

  return { noteActivity, setPlaying };
};

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
