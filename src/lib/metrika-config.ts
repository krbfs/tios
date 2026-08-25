function envFlag(name: string, defaultValue = true): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value !== "false" && value !== "0";
}

/** Yandex.Metrika counter id (public, baked into client bundle). */
export const metrikaConfig = {
  counterId: process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || "111930448",
  enabled: envFlag("NEXT_PUBLIC_YANDEX_METRIKA_ENABLED", true),
};

export function getPublicMetrikaConfig() {
  return {
    metrikaCounterId: metrikaConfig.counterId,
    metrikaEnabled: metrikaConfig.enabled,
  };
}
