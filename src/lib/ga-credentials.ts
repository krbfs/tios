import fs from "node:fs";
import path from "node:path";

export type GaServiceAccountCredentials = {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function parseCredentialsJson(raw: string): GaServiceAccountCredentials | null {
  try {
    const parsed = JSON.parse(raw) as GaServiceAccountCredentials;
    if (!parsed.client_email || !parsed.private_key) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Cloud Run: GA4_SERVICE_ACCOUNT_JSON. Local fallback: GOOGLE_APPLICATION_CREDENTIALS file. */
export function getGaServiceAccountCredentials(): GaServiceAccountCredentials | null {
  const inlineJson = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    return parseCredentialsJson(inlineJson);
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credentialsPath) {
    return null;
  }

  try {
    const absolutePath = path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.join(process.cwd(), credentialsPath);
    return parseCredentialsJson(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    return null;
  }
}

export function hasGaServiceAccountCredentials(): boolean {
  return getGaServiceAccountCredentials() !== null;
}
