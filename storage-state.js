export const migrateStorageState = (state, currentVersion) => {
  const version = Number(state?.version) || 1;
  if (version >= currentVersion) return state;
  const domains = { ...(state?.domains || {}) };
  if (version < 3) delete domains.Kusner;
  return { ...state, version: currentVersion, domains };
};

export const resetDomainState = (domains, key, defaultValue) => {
  const nextDomains = new Map(domains);
  nextDomains.delete(key);
  return {
    domains: nextDomains,
    domain: {
      uRange: [...defaultValue.uRange],
      vRange: [...defaultValue.vRange]
    }
  };
};

export const constrainDomain = (domain, surface) => {
  const clamp = (min, value, max) => Math.min(max, Math.max(min, value));
  const uBounds = surface.uBounds || surface.uRange;
  const uRange = [
    clamp(uBounds[0], domain.uRange[0], uBounds[1]),
    clamp(uBounds[0], domain.uRange[1], uBounds[1])
  ];
  return {
    uRange: uRange[0] < uRange[1] ? uRange : [...surface.uRange],
    vRange: [
      clamp(surface.vRange[0], domain.vRange[0], surface.vRange[1]),
      clamp(surface.vRange[0], domain.vRange[1], surface.vRange[1])
    ]
  };
};
