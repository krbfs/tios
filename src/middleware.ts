import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function canonicalHost(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tios-test.com";
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "tios-test.com";
  }
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  const apex = canonicalHost();

  if (host === `www.${apex}`) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = apex;
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
