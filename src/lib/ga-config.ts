function envFlag(name: string, defaultValue = true): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value !== "false" && value !== "0";
}

export const gaConfig = {
  measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-TYYGE7DS6E",
  enabled: envFlag("NEXT_PUBLIC_GA_ENABLED", true),
  propertyId: process.env.GA4_PROPERTY_ID || "",
};

export function isGaDataApiConfigured(): boolean {
  const hasInlineJson = Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
  const hasCredentialsFile = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
  return Boolean(gaConfig.propertyId && (hasInlineJson || hasCredentialsFile));
}

export function getPublicGaConfig() {
  return {
    gaMeasurementId: gaConfig.measurementId,
    gaEnabled: gaConfig.enabled,
  };
}
