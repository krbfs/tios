/** Stable marker for Cloud Logging filters (`jsonPayload.message="tios_antibot"`). */
export const ANTIBOT_LOG_MARKER = "tios_antibot";

export type AntibotEvent =
  | "rate_limit"
  | "invalid_origin"
  | "honeypot"
  | "challenge_missing"
  | "challenge_invalid"
  | "challenge_dwell"
  | "challenge_reused"
  | "test_token_missing"
  | "test_token_invalid"
  | "page_skip"
  | "timing_too_fast"
  | "timing_suspicious"
  | "unsigned_encdata"
  | "ip_blocked";

export type AntibotLogPayload = {
  event: AntibotEvent;
  status: number;
  reason: string;
  path?: string;
  method?: string;
  kind?: string;
  page?: number;
  retry_after_sec?: number;
} & Record<string, unknown>;

function requestPath(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Structured JSON line for Cloud Run → Cloud Logging. No-op in vitest. */
export function logAntibotEvent(
  request: Request,
  payload: AntibotLogPayload,
): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }

  const line = {
    severity: "WARNING",
    message: ANTIBOT_LOG_MARKER,
    event: payload.event,
    status: payload.status,
    reason: payload.reason,
    path: payload.path ?? requestPath(request),
    method: payload.method ?? request.method,
    ip: clientIpFromRequest(request),
    user_agent: request.headers.get("user-agent")?.slice(0, 240) ?? null,
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    ts: new Date().toISOString(),
    ...(payload.kind != null ? { kind: payload.kind } : {}),
    ...(payload.page != null ? { page: payload.page } : {}),
    ...(payload.retry_after_sec != null
      ? { retry_after_sec: payload.retry_after_sec }
      : {}),
  };

  console.warn(JSON.stringify(line));
}

export function logAntibotResponse(
  request: Request,
  response: Response,
  event: AntibotEvent,
  reason: string,
  extra: Omit<AntibotLogPayload, "event" | "status" | "reason"> = {},
): void {
  logAntibotEvent(request, {
    event,
    status: response.status,
    reason,
    ...extra,
  });
}
