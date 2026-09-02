export function apiRequest(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Request {
  const { json, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    return new Request(`http://localhost${path}`, {
      ...rest,
      headers,
      body: JSON.stringify(json),
    });
  }

  return new Request(`http://localhost${path}`, { ...rest, headers });
}

export function withBearer(token: string, request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  } as RequestInit);
}

export function withTestToken(token: string, request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("X-Test-Token", token);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  } as RequestInit);
}

export function withSessionUuid(sessionUuid: string, request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("x-session-uuid", sessionUuid);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  } as RequestInit);
}

export async function readJson<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}
