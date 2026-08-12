export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function error(message: string, status: number, details?: unknown): Response {
  return Response.json(
    details ? { error: message, details } : { error: message },
    { status },
  );
}

export async function parseJson<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return error("Invalid JSON body", 400);
  }
}
